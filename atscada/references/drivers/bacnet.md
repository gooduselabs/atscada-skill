# BACnet/IP - `BACnetClient.dll`

Nguồn xác nhận: README + source (`BacnetAddressing.cs`, `BACnetDriver.cs`, các `ctl*.cs`). DLL có trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\`.

## 1. Driver dùng cho gì
- Đọc/ghi thuộc tính object BACnet qua **BACnet/IP (UDP)** bằng ReadProperty / WriteProperty. Who-Is/I-Am chỉ dùng để quét thiết bị trong màn hình thiết kế.
- Không có COV, không ReadPropertyMultiple, không BBMD/foreign device, không phản hồi phân đoạn (segmented), chỉ IPv4.
- DLL: `BACnetClient.dll` (không cần DLL phụ).

## 2. ChannelAddress
Định dạng: `LocalIP!LocalPort!Timeout!Retries` - **4 trường, phân cách `!`**. Mặc định: `0.0.0.0!0!1500!0`.

| # | Trường | Mặc định | Ý nghĩa / ràng buộc |
|---|---|---|---|
| 1 | LocalIP | `0.0.0.0` | IPv4 của card mạng PC dùng để bind socket UDP. `0.0.0.0` = mọi card. |
| 2 | LocalPort | `0` | 0..65535. `0` = tự chọn cổng (khuyến nghị khi PC còn chạy phần mềm BACnet khác). |
| 3 | Timeout (ms) | `1500` | > 0 (UI yêu cầu >= 100). Thời gian chờ trả lời mỗi lần gửi. |
| 4 | Retries | `0` | >= 0 (UI giới hạn 0..10). Số lần gửi lại. |

- Parser khoan dung: trường thiếu hoặc sai sẽ lấy mặc định của trường đó (không báo lỗi). Vẫn nên ghi đủ 4 trường.
- Nên giữ `Timeout*(Retries+1)` < 3000 ms (read timeout của ATDriver Server; server tự thử lại).
- Ví dụ: `0.0.0.0!0!1500!0`, `192.168.1.100!47808!1000!1`.

## 3. DeviceID
Định dạng: `IP:Port` **hoặc** `IP:Port:Network:MAC` - phân cách `:`; **chỉ chấp nhận đúng 2 hoặc 4 phần** (3 phần = sai, tag Bad).

| # | Trường | Ý nghĩa / ràng buộc |
|---|---|---|
| 1 | IP | IPv4 của thiết bị (hoặc của router BACnet). Bắt buộc. |
| 2 | Port | 1..65535, bắt buộc. Cổng BACnet chuẩn là `47808` (0xBAC0). Không có giá trị mặc định khi bỏ trống. |
| 3 | Network | 0..65534. Số mạng BACnet của thiết bị nằm sau router (vd MS/TP). `0` = không định tuyến (MAC bị bỏ qua). |
| 4 | MAC | Thập phân 1 byte `0..255` (vd `12`) hoặc hex `0x0A0B..` (số chẵn ký tự hex, tối đa 7 byte). Chỉ kiểm tra khi Network != 0. |

Ví dụ: `192.168.1.20:47808`, `192.168.1.30:47808:5:12`, `192.168.1.30:47808:5:0x0A0B`.

## 4. Tag address
Định dạng: `ObjectType:Instance:Property[:Priority]` - phân cách `:`; **3 hoặc 4 phần**. Property có thể kèm chỉ số mảng: `PRIORITY[8]`.

- **ObjectType**: viết tắt (không phân biệt hoa thường) hoặc số 0..1023:
  `AI`(0) `AO`(1) `AV`(2) `BI`(3) `BO`(4) `BV`(5) `CAL`(6) `CMD`(7) `DEV`(8) `LOOP`(12) `MI`(13) `MO`(14) `NC`(15) `PRG`(16) `SCH`(17) `AVG`(18) `MV`(19) `TL`(20) `ACC`(23) `PC`(24) `CSV`(40) `IV`(45) `LAV`(46) `PIV`(48).
- **Instance**: 0..4194303.
- **Property**: viết tắt hoặc số 0..4194303:
  `PV`(85, present-value) `NAME`(77) `DESC`(28) `STATUS`(111, status-flags) `EVENT`(36) `RELIABILITY`(103) `OOS`(81, out-of-service) `UNITS`(117) `PRIORITY`(87, priority-array) `RELDEF`(104, relinquish-default) `ACTIVE_TEXT`(4) `INACTIVE_TEXT`(46) `STATE_TEXT`(110) `NUM_STATES`(74) `MIN_PV`(69) `MAX_PV`(65) `SYS_STATUS`(112) `VENDOR`(121) `MODEL`(70) `FIRMWARE`(44).
- **Chỉ số mảng**: `Property[n]`, vd `PRIORITY[8]`, `STATE_TEXT[2]`.
- **Priority** (tùy chọn, chỉ dùng khi ghi): 1..16, **không được là 6** (reserved). Bỏ trống = ghi không kèm priority.

Ví dụ: `AI:0:PV`, `AO:1:PV:8`, `BV:3:PV`, `MV:2:PV`, `DEV:1234:NAME`, `AO:1:PRIORITY[8]`, `2:5:85` (= AV:5:PV).

Không có truy cập bit, không có hậu tố kiểu dữ liệu.

## 5. Kiểu dữ liệu
`Bool`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String` (không có `Byte`/`Default` trong UI). BACnet không dùng register nên không có khái niệm số register/byte - Type chỉ quyết định cách ép giá trị:

| Type | Đọc |
|---|---|
| Bool | khác 0 -> `1`, bằng 0 -> `0` |
| Word / Short / DWord / Long | làm tròn rồi kiểm tra phạm vi (0..65535 / -32768..32767 / 0..4294967295 / int32); ngoài phạm vi -> Bad |
| Float / Double | số thực |
| String (hoặc Type rỗng) | dạng chữ của giá trị BACnet |

Gợi ý: AI/AO/AV -> `Float`; BI/BO/BV -> `Bool`; MI/MO/MV -> `Word`; NAME/DESC/... -> `String`. Không có scaling.

## 6. ReadOnly / ReadWrite
- Driver **không kiểm tra** ClientAccess; thiết bị từ chối (write-access-denied) -> ghi trả `Bad`. Đặt `ReadOnly` cho AI/BI/MI và các thuộc tính mô tả; `ReadWrite` cho AO/BO/MO/AV/BV/MV cần điều khiển.
- Kiểu BACnet khi ghi `PV`/`RELDEF` do **object type** quyết định (không theo Type của tag): analog/LOOP/PC = Real; binary = Enumerated 0/1 (nhận `1/0`, `true/false`, `on/off`, `active/inactive`); multi-state/PIV = Unsigned; CSV = CharacterString; IV = Signed; LAV = Double. `OOS` luôn là Boolean. Thuộc tính khác theo Type của tag.
- Ghi chuỗi `null` = relinquish (gửi Null ở priority chỉ định) - dùng để nhả lệnh ở AO/BO/MO.

## 7. Tag hệ thống / đặc biệt
Không có tag trạng thái riêng của driver. Có thể tự tạo tag chẩn đoán bằng thuộc tính BACnet, vd `DEV:<instance>:SYS_STATUS`, `AI:0:STATUS`, `AI:0:RELIABILITY`.

## 8. Block read
Không có. Mỗi tag = một request ReadProperty riêng, tuần tự -> nhiều tag sẽ chậm; cân nhắc tăng ChannelRate.

## 9. Lưu ý / lỗi hay gặp
- DeviceID có 3 phần (`IP:Port:Network`) hoặc thiếu Port -> toàn bộ tag của device Bad.
- Priority `6` hoặc ngoài 1..16 -> địa chỉ tag không hợp lệ (Bad cả đọc lẫn ghi).
- Thiết bị timeout bị giữ offline 10 giây (đọc trả Bad ngay); lệnh ghi vẫn được gửi.
- Instance của object `DEV` là Device Instance của thiết bị (không phải 0) - xem bằng nút Scan (Who-Is) hoặc tài liệu thiết bị.
- Nếu PC có phần mềm BACnet khác chiếm cổng 47808, để LocalPort = `0`.
- Thiết bị trả phản hồi phân đoạn (chuỗi/mảng dài) -> Bad.

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="BACnet1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\BACnetClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="0.0.0.0!0!1500!0" />
    <Device>
      <DeviceName Value="AHU1" />
      <DeviceID Value="192.168.1.10:47808" />
      <Tag Name="SupplyTemp" Addrress="AI:0:PV" Type="Float" ClientAccess="ReadOnly" Description="Supply air temperature" />
      <Tag Name="Setpoint" Addrress="AV:1:PV:8" Type="Float" ClientAccess="ReadWrite" Description="Setpoint, write priority 8" />
      <Tag Name="FanCmd" Addrress="BO:0:PV:8" Type="Bool" ClientAccess="ReadWrite" Description="Fan command" />
      <Tag Name="Mode" Addrress="MV:2:PV" Type="Word" ClientAccess="ReadWrite" Description="Operating mode" />
      <Tag Name="DeviceName" Addrress="DEV:1234:NAME" Type="String" ClientAccess="ReadOnly" Description="Device object name" />
    </Device>
  </Channel>
</Root>
```
