# Internal Memory - `InternalMemory.dll`

Nguồn xác nhận: README + source (`ATDriver.cs`, các `ctl*.cs`) và `ConvertFile.cs` của công cụ Simulator (nơi sinh ATFile cho driver này). DLL có trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\`.

## 1. Driver dùng cho gì
- Tag **nội bộ** không gắn thiết bị: giá trị lưu trong RAM của driver và định kỳ ghi ra file văn bản để còn lại sau khi khởi động lại. Dùng cho biến trung gian, setpoint/hằng số do người vận hành nhập, cờ trao đổi giữa các ứng dụng, và làm đích cho công cụ giả lập (xem `simulator-internal-memory.md`).
- DLL: `InternalMemory.dll` (không cần DLL phụ).

## 2. ChannelAddress
Định dạng: `InternalMemory|<SavingTimeMs>` - **2 trường, phân cách `|`**. Giá trị chuẩn: `InternalMemory|600000`.

| # | Trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| 1 | Tên | `InternalMemory` | Chuỗi tùy ý, không có tác dụng chức năng. Giữ nguyên `InternalMemory`. |
| 2 | SavingTimeMs | `600000` (10 phút) | Chu kỳ ghi dữ liệu ra file (ms). **Bắt buộc, phải là số > 0**. |

- **Phải có dấu `|` và phần số**: driver đọc `ChannelAddress.Split('|')[1]` ở mỗi lần Read; thiếu phần này (chỉ ghi `InternalMemory`) hoặc không phải số -> mọi tag Bad.
- Giảm chu kỳ (vd `InternalMemory|60000`) nếu cần ít mất dữ liệu hơn khi tắt đột ngột.

## 3. DeviceID
Định dạng: **chuỗi tự do = tên device** (giao diện gán DeviceID = DeviceName). Không có IP/COM/timeout.
- Quy ước: ghi DeviceID giống hệt DeviceName.
- DeviceID là một phần của khóa lưu trữ -> không chứa `,` và `*`.

## 4. Tag address
Địa chỉ = **chuỗi tự do**; quy ước của giao diện và công cụ chuyển đổi: **địa chỉ = tên tag** (`Addrress` giống `Name`).
- Khóa lưu giá trị: `ChannelName*DeviceID*TagAddress`. Hai tag cùng channel + device + địa chỉ sẽ dùng chung một giá trị.
- ChannelName, DeviceID, địa chỉ tag **không được chứa `,`** (file lưu tách khóa/giá trị tại dấu phẩy đầu tiên) và không nên chứa `*`.
- Không có vùng nhớ, không truy cập bit, không hậu tố.

## 5. Kiểu dữ liệu
Chỉ **`String`** (giao diện chỉ có lựa chọn này; công cụ chuyển đổi cũng ép mọi tag về `String`). Giá trị lưu nguyên dạng chuỗi, không có register/byte, không scaling. Ứng dụng tự đổi sang số khi cần.
- Driver trả nguyên chuỗi và không dùng Type để ép kiểu. Khai báo Type khác `String` (Float, Word...) có chạy đúng ở phía ATDriver Server/ATSCADA hay không: **chưa xác nhận** - dùng `String`.

## 6. ReadOnly / ReadWrite
- Luôn khai báo `ClientAccess="ReadWrite"` (tag bộ nhớ chỉ có ý nghĩa khi ghi được; công cụ chuyển đổi cũng đặt `ReadWrite`). Driver không kiểm tra ClientAccess.
- Ghi chỉ được **đưa vào hàng đợi** và trả `Good` ngay; giá trị thật sự đổi ở lần Read kế tiếp của channel.
- Ghi vào tag **chưa từng được đọc** (khóa chưa tồn tại) bị bỏ qua âm thầm - tag phải nằm trong ATFile và channel đang chạy.

## 7. Tag hệ thống / đặc biệt
Không có.

## 8. Block read
Không có.

## 9. Lưu ý / lỗi hay gặp
- Tag mới chưa có giá trị đọc ra chuỗi **hai khoảng trắng** `"  "` (không phải rỗng, không phải 0) - ứng dụng cần xử lý/khởi tạo giá trị ban đầu bằng cách ghi.
- File lưu: `C:\Program Files\ATPro\ATDriverServer\InternalMemory\InternalMemoryTag<ChannelName>.txt`, mỗi dòng `khóa,giá trị`. Tài khoản chạy ATDriver Server phải có **quyền ghi** vào thư mục này (nằm trong Program Files -> thường cần chạy quyền admin), nếu không giá trị mất sau khi khởi động lại.
- Giá trị chỉ được lưu theo chu kỳ; tắt chương trình giữa hai lần lưu sẽ mất thay đổi mới nhất (không có lưu khi thoát).
- Đổi ChannelName / DeviceID / địa chỉ tag = đổi khóa -> giá trị cũ không còn được nạp. Mỗi channel InternalMemory nên có ChannelName riêng (tên file theo ChannelName).
- Giá trị chứa ký tự xuống dòng làm hỏng file lưu.

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="Memory" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\InternalMemory.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="InternalMemory|600000" />
    <Device>
      <DeviceName Value="Mem" />
      <DeviceID Value="Mem" />
      <Tag Name="Setpoint1" Addrress="Setpoint1" Type="String" ClientAccess="ReadWrite" Description="Operator setpoint" />
      <Tag Name="ShiftName" Addrress="ShiftName" Type="String" ClientAccess="ReadWrite" Description="Current shift" />
    </Device>
  </Channel>
</Root>
```
