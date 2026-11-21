# OPC DA Client - `OPCDAClient.dll`

Nguồn xác nhận: README + source (`ATDriver.cs`, `OPCDevice.cs`, các `ctl*.cs`). DLL có trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\`, kèm `Interop.OPCAutomation.dll` (phải nằm cùng thư mục).

## 1. Driver dùng cho gì
- ATDriver Server làm **OPC DA client** (COM/DCOM), kết nối tới một OPC DA Server cài trên **cùng máy** (vd Kepware KEPServerEX, Matrikon, RSLinx OPC...). Dùng khi thiết bị không có driver ATSCADA trực tiếp nhưng có OPC Server.
- Yêu cầu máy chạy: OPC Core Components / OPC Automation Wrapper (`OPCAutomation.dll` đã đăng ký COM).
- DLL: `OPCDAClient.dll` (+ `Interop.OPCAutomation.dll`).

## 2. ChannelAddress
Định dạng: **một chuỗi duy nhất = ProgID của OPC Server**, không có trường/phân cách nào.

| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| OPC Server ProgID | (không có - bắt buộc) | Tên server như danh sách "Localhost OPC Server" trong giao diện, vd `Kepware.KEPServerEX.V6`, `Matrikon.OPC.Simulation.1` |

- Ghi đúng từng ký tự ProgID (lấy bằng nút Load trong màn hình Channel hoặc OPC client khác).
- Chỉ server **local**: source không có tham số host/node từ xa (driver gọi `Connect(ProgID)` không kèm tên máy). Kết nối OPC Server ở máy khác: chưa xác nhận (không hỗ trợ theo source).
- ChannelAddress rỗng bị bỏ qua (không kết nối).

## 3. DeviceID
Định dạng: **một số nguyên = Update Rate (ms)** của OPC Group. Mặc định `1000`.

- Mỗi Device = một **OPC Group** có tên = `DeviceName` (subscribed, `UpdateRate` = DeviceID). Vì vậy **DeviceName phải khác nhau** giữa các device trong cùng channel và không rỗng.
- DeviceID không phải số -> driver giữ update rate hiện tại (mặc định 1000) - không báo lỗi.
- DeviceID **không** phải địa chỉ thiết bị; thiết bị nào được đọc do Item ID của tag quyết định.
- Update rate chỉ áp dụng lúc group được tạo lần đầu; đổi sau đó cần khởi động lại ATDriver Server.

## 4. Tag address
Địa chỉ = **Item ID đầy đủ** của OPC Server, đúng như server công bố (lấy bằng browse trong màn hình Tag).
- Kepware: `Channel.Device.Tag`, vd `Channel1.Device1.Tag1`; có nhóm tag: `Channel1.Device1.Group1.Tag1`.
- Server khác: theo cú pháp riêng của server đó (vd `Random.Int4`, `[Topic]TagName`).
- Driver chuyển nguyên chuỗi cho `OPCItems.AddItem`; không có truy cập bit hay hậu tố của driver (nếu cần bit, dùng cú pháp của chính OPC Server).

## 5. Kiểu dữ liệu
`Default`, `Bool`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String`. Không có register/byte - kiểu thật do OPC Server quyết định; Type của tag chỉ là **phép kiểm tra** giá trị đọc về (parse không được -> Bad):

| Type | Điều kiện giá trị (dạng chuỗi) hợp lệ |
|---|---|
| Default, String | luôn hợp lệ (không kiểm tra) |
| Bool | phải là `True`/`False` (item kiểu Boolean của OPC). Item kiểu số trả `0`/`1` sẽ **Bad** với Type Bool |
| Word | 0..65535 |
| Short | -32768..32767 |
| DWord | 0..4294967295 |
| Long | int32 |
| Float, Double | số thực (parse theo culture của Windows) |

- Giá trị `True`/`False` được đổi thành `1`/`0` trước khi trả về ATSCADA.
- Khi không chắc kiểu, dùng `Default` (giao diện cũng đặt `Default` khi chọn item).
- Không có scaling, không có byte order.

## 6. ReadOnly / ReadWrite
- Màn hình Tag của driver không có ô chọn quyền truy cập; driver không kiểm tra ClientAccess. Trong ATFile vẫn phải ghi thuộc tính `ClientAccess` (`ReadOnly` hoặc `ReadWrite`).
- Ghi: item kiểu Boolean nhận `1` -> `true`, `0` -> `false`; kiểu khác ghi nguyên chuỗi. **Chỉ ghi khi quality của item đang Good (192)**, ngược lại trả `Bad`. Item chỉ đọc phía OPC Server -> `Bad`.

## 7. Tag hệ thống / đặc biệt
Driver không có tag hệ thống. Có thể dùng item hệ thống của chính OPC Server nếu có (vd Kepware `Channel1.Device1._System._Error`).

## 8. Block read
Không có cấu hình block. Driver đọc giá trị **cache** của OPC Group đã subscribe (server đẩy về theo Update Rate); việc gom gói với thiết bị do OPC Server lo.

## 9. Lưu ý / lỗi hay gặp
- Chỉ trả giá trị khi **Quality = 192 (Good)**; mọi quality khác (Uncertain, Bad, chưa có dữ liệu lần đầu) -> tag Bad.
- Sai ProgID hoặc OPC Server chưa chạy/không khởi động được -> toàn bộ tag Bad; lỗi kết nối không được báo rõ.
- OPC DA là COM 32-bit ở đa số server: cần OPC Core Components và quyền DCOM phù hợp cho tài khoản chạy ATDriver Server (chạy cùng user với OPC Server hoặc cấu hình DCOM).
- Hai device trùng DeviceName -> dùng chung một group.
- Tên tag ATSCADA không được chứa dấu `.`; Item ID (địa chỉ) thì có - đừng nhầm hai trường.
- Thư mục License có trong source nhưng không được driver gọi (không cần license riêng theo source hiện tại).

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="OPC1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\OPCDAClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="Kepware.KEPServerEX.V6" />
    <Device>
      <DeviceName Value="Group1" />
      <DeviceID Value="1000" />
      <Tag Name="Tag1" Addrress="Channel1.Device1.Tag1" Type="Default" ClientAccess="ReadOnly" Description="Value from OPC server" />
      <Tag Name="Speed" Addrress="Channel1.Device1.Speed" Type="Float" ClientAccess="ReadWrite" Description="Speed setpoint" />
      <Tag Name="Run" Addrress="Channel1.Device1.Run" Type="Bool" ClientAccess="ReadWrite" Description="Run command (Boolean item)" />
    </Device>
  </Channel>
</Root>
```
