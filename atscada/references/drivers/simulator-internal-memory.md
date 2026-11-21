# Simulator cho Internal Memory - `Driver Simulators.exe` (KHÔNG phải driver)

Nguồn xác nhận: README + source (`ConvertFile.cs`, csproj). **Đây không phải DLL driver của ATDriver Server**: project là ứng dụng WinForms (`OutputType` = WinExe, `AssemblyName` = `Driver Simulators` -> `Driver Simulators.exe`; README ghi tên exe là `SimulatorDriverInternalMeMory.exe` - theo csproj). Không có lớp `IATDriver`, không có màn hình Channel/Device/Tag. File này **không có** trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\` của máy khảo sát. **Không bao giờ ghi nó vào `ChannelDriverLocation`.**

## 1. Dùng cho gì
- Công cụ **giả lập dữ liệu** để demo/test khi chưa có thiết bị: sinh tín hiệu sine, xung vuông, tam giác (ramp), tăng ngẫu nhiên, sự kiện vượt ngưỡng và ghi định kỳ vào tag ATSCADA.
- Cách làm việc: (1) chuyển ATFile của dự án sang dùng driver **Internal Memory** (`InternalMemory.dll`, xem `internal-memory.md`); (2) ATDriver Server chạy file đã chuyển; (3) simulator ghi giá trị vào các tag đó qua `iDriver` của ATSCADA.
- Cần cài ATSCADA trên máy (dùng `iDriver.dll`, `ToolExtensions.dll`, `DriverPluginInterface.dll` trong `C:\Program Files\ATPro\ATSCADA\`); Import Excel cần Microsoft ACE OLEDB.

## 2. ChannelAddress
Không có định dạng riêng. Khi chuyển file ("To Simulation File"), công cụ ghi cứng cho **mọi** Channel:
- `ChannelDriverLocation` = `C:\Program Files\ATPro\ATDriverServer\Drivers\InternalMemory.dll`
- `ChannelAddress` = `InternalMemory|600000`

## 3. DeviceID
Không có định dạng riêng. Khi chuyển file: `DeviceID` = giá trị `DeviceName` của chính device đó.

## 4. Tag address
Khi chuyển file, với mỗi `Tag`: `Addrress` = `Name` (địa chỉ = tên tag). `Name` và `Description` giữ nguyên.

## 5. Kiểu dữ liệu
Khi chuyển file: `Type` = `String` cho mọi tag. Simulator luôn ghi giá trị dạng chuỗi số (vd `12.34`).

## 6. ReadOnly / ReadWrite
Khi chuyển file: `ClientAccess` = `ReadWrite` cho mọi tag (bắt buộc để simulator ghi được).

## 7. Tag hệ thống / đặc biệt
Không có. Các dạng giả lập (cấu hình trong giao diện công cụ, lưu file `*.simcfg`, không nằm trong ATFile):

| Tab | Tham số | Hành vi |
|---|---|---|
| Sine | Amplitude, Cycle Time, Phase Deviation, Scan time | Sóng sine; scan time 0 -> 2000 ms |
| Square | High Level, Low Level, TON, TOFF | Xung vuông, timer cố định 1000 ms |
| Ramp | High Level, Low Level, Cycle Time, SampleTime | Tam giác 0 -> High -> 0 (Low Level không được dùng trong công thức) |
| Increasing | Min/High Value Change, SampleTime | Cộng dồn bước ngẫu nhiên trong [Min, Max] (giả lập công tơ) |
| Threshold Events | Threshold H/L, Events High/Low per hour, Duration | Ngẫu nhiên giữa L và H, định kỳ vượt H hoặc xuống dưới L (giả lập alarm) |

Tag trong simulator được chọn theo tên tag ATSCADA (`Task.TagName` của TagFile phía ATSCADA), tag không tồn tại bị bỏ qua âm thầm.

## 8. Block read
Không áp dụng.

## 9. Lưu ý / lỗi hay gặp
- Việc chuyển file **thay thế driver thật của mọi channel** trong ATFile -> luôn lưu ra file mới, giữ file gốc để chạy với thiết bị thật.
- Tự tay tạo ATFile giả lập thì làm đúng 5 quy tắc trên (driver location, `InternalMemory|600000`, DeviceID = DeviceName, Addrress = Name, Type String + ReadWrite) - kết quả tương đương công cụ.
- Sau khi chuyển, mọi tag là `String`: ứng dụng/đồ họa đang mong kiểu số vẫn nhận chuỗi số. Tag chưa được simulator ghi sẽ đọc ra hai khoảng trắng `"  "`.
- Tùy chọn "Restart ATDriver Server" ghi lại `C:\Program Files\ATPro\ATDriverServer\Project Files\Init.DFI` trỏ tới file mới rồi tắt/mở lại ATDriver Server; tên tiến trình trong source là `ATDriver SerVer` - có khớp tiến trình thực hay không: chưa xác nhận. Nếu không tự khởi động lại, mở file mới thủ công trong ATDriver Server.
- Nút Run/Stop của Sine, Square, Ramp chạy/dừng cả ba cùng lúc; Increasing và Threshold có Run/Stop riêng.
- Simulator ghi qua ATSCADA nên ATDriver Server phải đang chạy với file đã chuyển.

## 10. ATFile mẫu (kết quả sau khi chuyển - dùng driver InternalMemory)
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="Line1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\InternalMemory.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="InternalMemory|600000" />
    <Device>
      <DeviceName Value="Meter1" />
      <DeviceID Value="Meter1" />
      <Tag Name="Voltage" Addrress="Voltage" Type="String" ClientAccess="ReadWrite" Description="Simulated voltage" />
      <Tag Name="Energy" Addrress="Energy" Type="String" ClientAccess="ReadWrite" Description="Simulated energy counter" />
    </Device>
  </Channel>
</Root>
```
