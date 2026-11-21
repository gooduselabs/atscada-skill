# ModbusIEC104 (ModbusIEC104.dll) - CHƯA DÙNG ĐƯỢC TRONG ATDRIVER SERVER

## 1. Driver dùng cho gì + tên DLL

- Dù tên có chữ "Modbus", đây **không phải** driver Modbus và không phải gateway Modbus-IEC104. Source là một client (master) IEC 60870-5-104 thuần qua TCP.
- DLL: `ModbusIEC104.dll` (tên lấy từ csproj). **Không có trong thư mục cài** `C:\Program Files\ATPro\ATDriverServer\Drivers\`.
- **Trạng thái: dở dang.** Lớp `IEC104Driver` không triển khai interface `IATDriver` thật của ATDriver Server (không có `ChannelAddress`, `DeviceID`, `TagAddress`, `Read()`, `Write()`, không có màn hình cấu hình Channel/Device/Tag), và source nhiều khả năng không biên dịch được. ATDriver Server gần như chắc chắn không nạp được DLL này.
- **Khuyến nghị: không tạo ATFile cho driver này.** Nếu cần IEC 104, xem `iec104.md` (driver `iIEC104.dll`). Nếu cần Modbus, xem `modbus-tcp.md` / `modbus-rtu.md`.

Các mục dưới đây mô tả định dạng **theo thiết kế trong source**, để nhận diện nếu gặp file cũ. Toàn bộ đều "chưa xác nhận" về khả năng chạy thực tế.

## 2. ChannelAddress

- Source không có khái niệm ChannelAddress. Định dạng: **chưa xác nhận** (không tồn tại trong code).

## 3. DeviceID (theo thiết kế, chưa xác nhận chạy được)

Tối đa 12 trường, phân tách bằng `|`. Chỉ 2 trường đầu là cần thiết; trường thiếu hoặc không parse được dùng mặc định.

```
IP|Port|COA|K|W|T0|T1|T2|T3|InterrogationType|InterrogationInterval|BlockSettings
```

| # | Trường | Ý nghĩa | Mặc định |
|---|---|---|---|
| 1 | IP | IP trạm IEC 104 | `127.0.0.1` |
| 2 | Port | Cổng TCP | `502` (mặc định của lớp cơ sở; chuẩn IEC 104 là `2404`, phải ghi rõ) |
| 3 | COA | Common Address of ASDU | `1` |
| 4 | K | Số I-frame tối đa chưa xác nhận | `12` |
| 5 | W | Cửa sổ ACK | `8` |
| 6 | T0 | Timeout kết nối (giây) | `30` |
| 7 | T1 | Timeout gửi (giây) | `15` |
| 8 | T2 | Timeout nhận (giây) | `10` |
| 9 | T3 | Timeout test frame (giây) | `20` |
| 10 | InterrogationType | `General` (20) hoặc `Group1`..`Group16` (21..36) | `General` |
| 11 | InterrogationInterval | Chu kỳ gửi interrogation (giây) | `300` |
| 12 | BlockSettings | Hàm parse chỉ là placeholder, luôn cho danh sách rỗng | rỗng |

Ví dụ: `192.168.1.10|2404|1|12|8|30|15|10|20|General|300|`.

## 4. Tag address (theo thiết kế, chưa xác nhận chạy được)

```
CA.IOA.TypeID
CA.IOA.TypeID.ElementIndex
```

| Phần | Phạm vi |
|---|---|
| CA | Common Address 1..65535 |
| IOA | Information Object Address 1..16777215 |
| TypeID | 1..127, phải thuộc danh sách hỗ trợ ở mục 5 |
| ElementIndex | 0..255 (tuỳ chọn) |

Ví dụ: `1.100.13` (float đo lường), `1.200.1` (single point), `1.300.45` (single command), `1.400.50` (setpoint float).

## 5. Kiểu dữ liệu

Kiểu do **TypeID trong địa chỉ** quyết định, không do thuộc tính `Type` của tag (cách thuộc tính `Type` được dùng: chưa xác nhận).

| Nhóm | TypeID |
|---|---|
| Giám sát | 1 SinglePoint, 3 DoublePoint, 5 StepPosition, 7 Bitstring32, 9 NormalizedValue, 11 ScaledValue, 13 FloatValue, 15 IntegratedTotals |
| Điều khiển | 45 SingleCommand, 46 DoubleCommand, 47 StepCommand, 48 NormalizedSetpoint, 49 ScaledSetpoint, 50 FloatSetpoint |
| Hệ thống | 100 InterrogationCommand, 101 CounterInterrogationCommand, 102 ReadCommand, 103 ClockSynchronizationCommand, 105 ResetProcessCommand |

Không có khái niệm "số thanh ghi"; mỗi tag là một information object.

## 6. ReadOnly / ReadWrite

- Suy ra từ TypeID: nhóm giám sát = ReadOnly; nhóm điều khiển và hệ thống = ReadWrite.
- Chỉ tag kiểu lệnh mới ghi được.

## 7. Tag hệ thống / đặc biệt

- Các TypeID 100, 101, 102, 103, 105 được thiết kế làm tag lệnh hệ thống (interrogation, đồng bộ giờ, reset). Chưa xác nhận hoạt động.

## 8. Block read

- Không có block kiểu dải thanh ghi. Dữ liệu được thiết kế lấy từ general interrogation và dữ liệu tự phát, lưu cache theo IOA. `BlockSettings` chưa được cài đặt.

## 9. Lưu ý / lỗi hay gặp

- Đừng nhầm driver này với Modbus chỉ vì tên DLL.
- Port mặc định trong code là 502 (của Modbus), không phải 2404.
- Không có màn hình thiết kế, không có ChannelAddress: không thể cấu hình qua ATDriver Server.
- Không có DLL build sẵn trong source và không có trong thư mục cài.
- Ký tự ngăn cách theo thiết kế: `|` trong DeviceID, `.` trong tag address.

## 10. ATFile mẫu

**Chưa xác nhận - chỉ minh hoạ cấu trúc theo thiết kế trong source, không kỳ vọng chạy được.** Không sinh cấu hình này cho dự án thật.

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="IEC104_Draft" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\ModbusIEC104.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="" />
    <Device>
      <DeviceName Value="RTU1" />
      <DeviceID Value="192.168.1.10|2404|1|12|8|30|15|10|20|General|300|" />
      <Tag Name="CB_Status" Addrress="1.200.1" Type="Bool" ClientAccess="ReadOnly" Description="Single point" />
      <Tag Name="Voltage" Addrress="1.100.13" Type="Float" ClientAccess="ReadOnly" Description="Short float" />
      <Tag Name="CB_Cmd" Addrress="1.300.45" Type="Bool" ClientAccess="ReadWrite" Description="Single command" />
    </Device>
  </Channel>
</Root>
```
