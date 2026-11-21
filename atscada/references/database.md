# Bước 4 - Database (MySQL)

Mỗi project **một database riêng**; tên do người dùng chốt. Lấy host, port và tài khoản MySQL từ cấu hình dự án hoặc hỏi người dùng. Không dùng mật khẩu mẫu cho hệ thật.

`gen.js` ghi `<db>.sql` (chạy tay bằng `mysql -u<user> -p < <db>.sql`), đồng thời đưa cùng nội dung vào desktop app để app tự tạo thứ còn thiếu khi khởi động.

## Bộ bảng chuẩn

```sql
CREATE DATABASE IF NOT EXISTS `<db>` DEFAULT CHARACTER SET utf8;
USE `<db>`;

CREATE TABLE IF NOT EXISTS `alarmlog` (
  `DateTime` datetime NOT NULL, `TagName` varchar(100) NOT NULL, `TagAlias` varchar(100) NOT NULL,
  `Value` varchar(45) NOT NULL, `HighLevel` varchar(45) NOT NULL, `LowLevel` varchar(45) NOT NULL,
  `Status` varchar(200) NOT NULL, `Acknowledged` varchar(45) NOT NULL, KEY `idx_dt` (`DateTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `alarmsettings` (
  `TagName` varchar(100) NOT NULL, `TagAlias` varchar(100) NOT NULL,
  `HighLevel` varchar(100) NOT NULL, `LowLevel` varchar(100) NOT NULL, `Email` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`TagName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `useraccount` (
  `UserName` varchar(100) NOT NULL, `Password` varchar(100) NOT NULL, `Role` varchar(50) NOT NULL,
  PRIMARY KEY (`UserName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- mỗi iDataLogger một bảng: cột DateTime + mỗi alias một cột
CREATE TABLE IF NOT EXISTS `datalog_meter1` (
  `DateTime` datetime NOT NULL, `Power_P` varchar(32) DEFAULT NULL, `Energy_total` varchar(32) DEFAULT NULL,
  KEY `idx_dt` (`DateTime`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

## `alarmsettings` - danh sách alarm

Mỗi alarm một dòng; `iAlarmLogger` đọc bảng này lúc chạy.

| Cột | Nội dung |
|---|---|
| `TagName` | `Task.Tag` cần giám sát |
| `TagAlias` | tên hiển thị trong bảng alarm trên web (nên ghi đủ: thiết bị · đại lượng (đơn vị)) |
| `HighLevel`, `LowLevel` | **tên tag** chứa ngưỡng, dạng `Task.Tag`. Logger đọc ngưỡng như đọc một tag, nên ngưỡng phải là tag có thật trong TagFile |
| `Email` | danh sách người nhận cách nhau dấu phẩy, có thể NULL |

- Người dùng đưa ngưỡng là con số: khai báo tag ngưỡng (`Hi_<Tag>`, `Lo_<Tag>`) ở một device Internal Memory, và đưa con số vào `DEFAULTS` của `model.js` để desktop app ghi làm giá trị khởi tạo. Nhờ vậy người vận hành sửa ngưỡng trên web bằng ô nhập.
- Không cần ngưỡng thấp thì vẫn khai báo tag và để giá trị 0 (với `zeroIsValid`).
- `iAlarmLogger` tự ghi `alarmlog`: `Status` là `High Alarm`, `Low Alarm` hoặc trạng thái thường; `Acknowledged` = `No`.
- Lệnh chèn dùng `ON DUPLICATE KEY UPDATE` trên tên hiển thị và tên tag ngưỡng, nên chạy lại không sinh dòng trùng. Email người vận hành đã nhập không bị ghi đè.

Trong `model.js`: `ALARMS = [['Meter1.Power_P', 'Incomer 1 · Power (kW)', 'Meter1_Cfg.Hi_Power_P', 'Meter1_Cfg.Lo_Power_P', null], ...]`.

## Bảng log dữ liệu

- Mỗi `iDataLogger` một bảng. Cột trùng alias trong `Collection` của logger (tên cột: chữ, số, gạch dưới).
- **Cột số liệu là `varchar`**, giống cách `iDataLogger` tự tạo bảng. Web đọc ra đúng chuỗi `"12.5"`, không phụ thuộc dấu thập phân theo vùng của máy chủ. Hệ quả: khi tự viết SQL phải ép số, ví dụ ``MAX(`Energy_total`+0)``, ``ORDER BY `Power_P`+0``; so sánh chuỗi sẽ cho `"9" > "10"`.
- Có index trên `DateTime` (biểu đồ lịch sử và báo cáo đều lọc theo thời gian).
- Chia bảng theo đối tượng: mỗi thiết bị một bảng chi tiết, mỗi cụm (nhà máy, khu) một bảng tổng hợp, toàn hệ thống một bảng. Bảng tổng hợp nên chứa luôn công suất và điện năng của từng thiết bị con (cột `M01_Power`, `M01_Energy`...) để vẽ biểu đồ so sánh từ một bảng. Thêm thiết bị mới thì nhớ thêm vào bảng tổng hợp, nếu không báo cáo tổng sẽ thiếu.
- Cột điện năng, sản lượng, giờ chạy lưu **số tích luỹ** (chỉ số công tơ). Báo cáo năng lượng theo giờ/ngày/tháng trên web lấy chênh lệch của số tích luỹ.

Trong `model.js`: `LOGGERS = [{ name: 'Meter1', table: 'datalog_meter1', items: [['Meter1.Power_P', 'Power_P'], ...] }]`.

## Bảng tổng hợp do app tự ghi

Số liệu theo ngày, theo tháng (điện năng, chi phí, CO2, điểm số...) không log trực tiếp được; desktop app tính từ bảng log rồi ghi vào bảng riêng, có khoá chính là `DateTime` (đầu ngày, đầu tháng) để ghi lại nhiều lần không trùng (`INSERT ... ON DUPLICATE KEY UPDATE`, `REPLACE INTO`). Khai báo trong `model.js`: `TABLES = [{ name: 'energy_daily', cols: [...], pk: true }]`. Cách tính xem `references/desktop-app.md`, mục "Tổng hợp theo ngày".

Web vẽ được biểu đồ lịch sử và báo cáo từ các bảng này như bảng log thường.

## `useraccount` - tài khoản web

- `Password` là MD5 viết hoa (32 ký tự hex) của mật khẩu; `Role` là `Admin` hoặc `Operator`.
- Hỏi người dùng tên và mật khẩu rồi để `gen.js` tính hash (`PROJECT.users`). Không chép hash từ nơi khác, không đọc hay đổi mật khẩu có sẵn.
- Lệnh chèn dùng `INSERT IGNORE`: tài khoản đã có thì giữ nguyên.
- Chỉ bật đăng nhập trên web (`PROJECT.login = true`) khi bảng này chắc chắn có ít nhất một tài khoản Admin; bảng trống thì không ai vào được.

## An toàn dữ liệu

- Không `DROP`, `TRUNCATE`, `DELETE` trên database đang có dữ liệu. Mọi lệnh tạo dùng `IF NOT EXISTS`.
- Đổi cấu trúc bảng log (thêm cột) trên database đã có dữ liệu: dùng `ALTER TABLE ... ADD COLUMN`, và hỏi người dùng trước. `CREATE TABLE IF NOT EXISTS` không thêm cột vào bảng đã tồn tại, nên logger sẽ ghi lỗi nếu bảng thiếu cột.
- Dữ liệu lịch sử giả để demo báo cáo: sinh bằng script, có chu kỳ ngày/tuần, số tích luỹ tăng đơn điệu và khớp điểm cuối với số liệu hiện tại. Chỉ sinh khi bảng trống, hoặc chèn qua bảng tạm và chỉ lấy dòng cũ hơn dòng thật sớm nhất, để chạy lại không trùng và không đè dữ liệu thật. Nói rõ với người dùng đó là dữ liệu giả.

