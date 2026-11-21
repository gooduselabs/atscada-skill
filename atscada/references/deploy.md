# Bước 6 - Chạy thử, triển khai, kiểm tra

## Thứ tự khởi động

1. **MySQL** đang chạy; tài khoản của project đăng nhập được. Chạy `<db>.sql` một lần, hoặc để desktop app tự tạo.
2. **ATDriver Server**: mở `ATFile_<Ten>.xml`. Tag thiết bị phải lên Good; tag Internal Memory mới tạo còn trống là bình thường. Chạy với quyền đủ để ghi vào thư mục `InternalMemory` trong thư mục cài (thường là quyền admin), nếu không giá trị tag nội bộ mất sau khi khởi động lại.
3. **Desktop app**: chạy `DesktopApp\bin\Debug\<Ten>_App.exe`, chỉ một bản. Bảng trên form cho thấy số tag Good của từng task; dòng trạng thái báo database và việc ghi giá trị khởi tạo.
4. **Web**: site IIS trỏ vào thư mục `Fastweb`, mở `http://<máy>/#/<trang đầu>`.

Thứ tự này quan trọng: web lấy số liệu từ desktop app, desktop app lấy từ ATDriver Server.

Sau khi đổi `model.js` và sinh lại: build lại desktop app, mở lại ATFile trong ATDriver Server (nếu tag đổi), F5 trang web. Nếu cấu trúc bảng log đổi trên database đã có dữ liệu, xem mục "An toàn dữ liệu" trong `references/database.md`.

## IIS

- Site (hoặc application) trỏ tới thư mục `Fastweb`; application pool chạy .NET CLR v4, pipeline Integrated.
- Tài khoản của application pool cần quyền đọc thư mục web.
- Một site phục vụ một project (một `ATSCADAWebConfig.xml`). Nhiều project trên một máy: mỗi project một site với cổng khác nhau, và mỗi desktop app một cổng `iWebService` khác nhau.
- Web và desktop app khác máy: `at-service at-address` là IP máy chạy desktop app, `iWebService.Server` đặt IP đó (không phải `localhost`), mở cổng trên tường lửa.
- Việc tạo site, đổi cổng, cấp quyền trên IIS là thay đổi ngoài thư mục project: nói rõ các bước và để người dùng làm, hoặc hỏi trước khi làm thay.
- Trước khi sửa một thư mục web đang chạy, xác định đúng project đang được phục vụ (xem tiêu đề trang đăng nhập hoặc `at-title`), vì thư mục đang mở có thể thuộc project khác.

## Kiểm tra chéo (`check`)

`node tools/gen.js --check` chạy mọi kiểm tra mà không ghi file:

| Kiểm tra | Bắt được |
|---|---|
| tên channel/device/task/tag | ký tự cấm, dấu chấm, trùng tên |
| kiểu và quyền ghi của tag | `Type` lạ, `ClientAccess` sai |
| logger, alarm, liên kết, giá trị khởi tạo | dùng tag không có trong TagFile; trùng cột |
| cấu hình web | trùng `at-component-name`, trùng `at-location`; tag không có trong TagFile |
| bảng và cột | biểu đồ lịch sử, báo cáo, card v3 trỏ tới bảng/cột không tồn tại |
| SVG | id trùng, liên kết trỏ tới id không có, vùng bấm mà không ai ghi đích, đích là trang không tồn tại |
| bản Fastweb | dùng card v3 trên bản web không có |
| đăng nhập | bật đăng nhập mà không có tài khoản mặc định (cảnh báo) |

Nó **không** kiểm tra được: chuỗi địa chỉ của driver (đối chiếu tay với file driver), chuỗi kết nối trong `Web.config`, cổng dịch vụ, và mọi thứ chỉ thấy khi chạy thật.

Project viết tay không dùng bộ sinh: tự làm các kiểm tra trên bằng một script ngắn (parse XML, trích tên tag từ TagFile thành tập hợp, so với mọi `at-data-tag-name`), không soát bằng mắt.

## Khi có gì đó không chạy

| Hiện tượng | Xem gì |
|---|---|
| Tag Bad trong ATDriver Server | `references/atfile.md`, mục "Tag Bad thì xem gì", và file driver |
| Form desktop: task có 0 tag Good | ATDriver Server chưa mở ATFile, hoặc `Tag_file.XML` cạnh exe là bản cũ, hoặc tên Channel/Device không khớp ATFile |
| Web báo "Please check the configuration file again" | XML không nạp được: chuỗi `atscada-assembly` sai, thẻ `<atscada-components />` tự đóng, XML hỏng. Parse file và so với khung chuẩn |
| Web hiện `- - -` ở mọi thẻ | desktop app chưa chạy, hoặc `at-service` sai máy/cổng, hoặc tường lửa |
| Một thẻ hiện `- - -` | tên tag sai so với TagFile |
| Biểu đồ lịch sử, báo cáo trống hoặc lỗi | `at-connection` không có trong `Web.config`; bảng/cột sai; logger chưa ghi (tag Bad và `AllowLogWhenBad = false`); khoảng ngày mặc định chỉ là hôm nay |
| Công tắc, ô nhập bị khoá | tag không Good; hoặc thiếu chuỗi kết nối `atscada` trong `Web.config` |
| Bấm sơ đồ không chuyển trang | desktop app chưa ghi đích (tag liên kết trống); thiếu trong `LINKS`; vùng bấm bị phần tử khác che |
| Số trên sơ đồ không đổi | id sai/trùng; hai sơ đồ trong một trang; tên tag sai |
| Bảng log không có dòng mới | xem dòng trạng thái của app; culture chưa ép về Invariant; bảng thiếu cột; tài khoản thiếu quyền |
| Không đăng nhập được | bảng `useraccount` trống; mật khẩu không phải MD5 chữ hoa; sai nhiều lần bị khoá theo IP 15 phút |
| Alarm không ghi | bảng `alarmsettings` trống; tag ngưỡng trống hoặc không phải số |

## Mức kiểm chứng khi giao

Nói rõ từng mục thuộc mức nào:

- **Đã kiểm bằng máy**: parse XML, kiểm tra chéo của `gen.js`, build thành công, ảnh xem thử của sơ đồ.
- **Đã chạy thật**: chỉ khi ATDriver Server, desktop app và web đã chạy trên máy này và đã nhìn thấy số liệu.
- **Chưa kiểm**: kết nối thiết bị thật, thứ tự word, alarm và email, hành vi trên trình duyệt (màu theo trạng thái, liên kết, điều khiển), IIS. Liệt kê để người dùng tự kiểm.
