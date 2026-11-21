# Modbus TCP (ModbusTCP.dll)

## 1. Driver dùng cho gì + tên DLL

- ATSCADA làm Modbus TCP master/client, đọc/ghi Coil, Input Contact, Input Register, Holding Register của PLC, đồng hồ, gateway Modbus TCP.
- DLL: `ModbusTCP.dll` (có trong thư mục cài `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- IP/Port nằm ở **Device**, không nằm ở Channel. Một Channel chứa được nhiều Device với IP khác nhau; các Device cùng `IP:Port` dùng chung một kết nối TCP.

## 2. ChannelAddress

Chỉ có **1 trường**, không có separator:

```
Lifetime
```

| Trường | Ý nghĩa | Mặc định | Ví dụ |
|---|---|---|---|
| Lifetime | Số nguyên không âm (giây). Thời gian sống của một kết nối TCP; hết hạn driver tự ngắt và kết nối lại. `0` = không giới hạn | UI: `3600` | `3600` |

- Nếu chuỗi không phải số nguyên không âm (kể cả để rỗng), driver tự dùng `60`.
- Không ghi IP hay port vào đây.

## 3. DeviceID

Đúng **7 trường**, phân tách bằng `|`. Sai số trường hoặc trường số không parse được thì device bị bỏ qua, mọi tag Bad (không có thông báo lỗi).

```
IP|Port|UnitID|TimeOut|OrderBy|MaxReadTimes|BlockSettings
```

| # | Trường | Ý nghĩa | Mặc định UI | Ví dụ |
|---|---|---|---|---|
| 1 | IP | Địa chỉ IP thiết bị (runtime không kiểm tra định dạng) | `127.0.0.1` | `192.168.1.10` |
| 2 | Port | Cổng TCP (số nguyên) | `502` | `502` |
| 3 | UnitID | Unit ID / slave id (số nguyên) | `1` | `1` |
| 4 | TimeOut | ms, cho connect/gửi/nhận. Giá trị < 500 bị bỏ qua, driver giữ 3000 | `1000` | `1000` |
| 5 | OrderBy | Thứ tự word cho kiểu 32/64-bit: `1` = word đầu là word cao (High, big-endian word), `0` = word đầu là word thấp | `1` | `1` |
| 6 | MaxReadTimes | Số lần gọi đọc tag giữa hai lượt đọc block. Runtime ép: `> 100` thành `10`, `< 1` thành `3` | `1000` (thực chạy = 10) | `10` |
| 7 | BlockSettings | Danh sách block đọc gộp, **được phép rỗng** nhưng dấu `|` trước nó vẫn phải có | rỗng | `4-1-1-100` |

Ví dụ không block: `192.168.1.10|502|1|1000|1|10|` (kết thúc bằng `|`).
Ví dụ có block: `192.168.1.10|502|1|1000|1|10|4-1-1-100/3-1-1-50`.

## 4. Tag address

Địa chỉ kiểu Modbus 6 chữ số; chữ số đầu chọn vùng nhớ. Driver tự thêm số 0 bên trái cho đủ 6 chữ số.

| Địa chỉ | Vùng | Function code | Offset gửi đi |
|---|---|---|---|
| `000001`..`099999` (viết `1`..`99999` cũng được) | Coil | đọc FC01, ghi FC05 | địa chỉ - 1 |
| `100001`..`199999` | Input Contact | FC02 | địa chỉ - 100001 |
| `300001`..`399999` | Input Register | FC04 | địa chỉ - 300001 |
| `400001`..`499999` | Holding Register | đọc FC03, ghi FC06 (1 thanh ghi) / FC16 (nhiều thanh ghi) | địa chỉ - 400001 |

- **Bit trong thanh ghi** (chỉ vùng 3 và 4): thêm `.0`..`.15`, kiểu bắt buộc là `Bool`. Ví dụ `400010.3`.
- Không có hậu tố nào khác (không có hậu tố kiểu, độ dài chuỗi, scaling).
- **Bẫy 5 chữ số**: `40001` KHÔNG phải Holding Register 1. Chuỗi 1-5 chữ số luôn được hiểu là Coil (`40001` = Coil 40001). Vùng 1/3/4 phải viết đủ 6 chữ số: `400001`, `300001`, `100001`.
- Thanh ghi số 0 không tồn tại (`400000`, `000000` không hợp lệ).

Ví dụ: `000005` (Coil 5), `100010` (Input Contact 10), `300001` Float, `400101` DWord, `400020.5` Bool.

## 5. Kiểu dữ liệu

Giá trị thuộc tính `Type` (không phân biệt hoa thường khi chạy; nên viết đúng như bảng):

| Type | Số thanh ghi 16-bit | Ghi chú |
|---|---|---|
| `Bool` | 1 bit (Coil/Input Contact) hoặc 1 thanh ghi + `.bit` | Giá trị `0`/`1` |
| `Word` | 1 | UInt16 |
| `Short` | 1 | Int16 |
| `DWord` | 2 | UInt32 |
| `Long` | 2 | Int32 |
| `Float` | 2 | IEEE754 32-bit |
| `DLong` | 4 | UInt64 |
| `Double` | 4 | IEEE754 64-bit |
| `Default` | - | Coil/Input Contact: thành Bool; vùng 3/4 không có `.bit`: thành Word |

- Kiểu lạ (ví dụ `String`, `Byte`) bị coi như `Default`.
- Quy tắc kiểu - vùng (sai là tag Bad):
  - Coil, Input Contact: chỉ `Bool` hoặc `Default`.
  - Vùng 3/4 **có** `.bit`: chỉ `Bool` (`Default` cũng bị từ chối).
  - Vùng 3/4 **không có** `.bit`: không được `Bool`.
- Byte trong mỗi word luôn big-endian; thứ tự word theo `OrderBy` của Device (áp cho mọi tag 32/64-bit của device đó).
- Không có scaling, không có kiểu String/BCD. Giá trị trả về là chuỗi số thô.

## 6. ReadOnly / ReadWrite

| Vùng | ClientAccess đúng |
|---|---|
| Coil (0xxxxx) | `ReadWrite` |
| Input Contact (1xxxxx) | `ReadOnly` |
| Input Register (3xxxxx) | `ReadOnly` |
| Holding Register (4xxxxx) | `ReadWrite` |

- Ghi vào vùng 1/3 luôn trả `Bad` dù khai `ReadWrite`.
- Ghi Coil chỉ nhận chuỗi `0` hoặc `1`. Ghi thanh ghi: chuỗi số đúng kiểu (ví dụ Word phải 0..65535).
- Ghi bit thanh ghi (`400010.3`) là đọc - sửa bit - ghi lại cả thanh ghi (không nguyên tử).

## 7. Tag hệ thống / đặc biệt

Không có.

## 8. Block read

`BlockSettings` (trường 7 của DeviceID) = các block cách nhau bởi `/`, mỗi block:

```
Area-Position-From-To
```

| Phần | Ý nghĩa |
|---|---|
| Area | `0` = Coil, `1` = Input Contact, `3` = Input Register, `4` = Holding Register |
| Position | Số thứ tự ô trên giao diện, `1`..`10` cho mỗi Area. Runtime không dùng, nhưng màn hình sửa Device cần giá trị 1..10 và không trùng trong cùng Area |
| From, To | Số thứ tự thanh ghi/bit **1-based không kèm tiền tố vùng** (1..99999), `From <= To`. Holding `400001..400100` viết `4-1-1-100` |

- Block lớn được tự chia: tối đa 1920 bit (Coil/Input Contact) hoặc 120 thanh ghi mỗi lần đọc.
- Tag nằm **trọn** trong một block con thì lấy từ buffer; tag ngoài block (hoặc vắt qua ranh giới 120 thanh ghi) thì đọc riêng từng tag.
- Block được đọc lại sau mỗi `MaxReadTimes` lần gọi đọc tag (đếm theo lượt đọc tag, không theo thời gian). Nên đặt `MaxReadTimes` xấp xỉ số tag của device, tối đa 100.
- Lượt đọc block gần nhất thất bại thì mọi tag trong block đó Bad.

## 9. Lưu ý / lỗi hay gặp

- DeviceID thiếu dấu `|` cuối khi không có block (chỉ 6 trường) là hỏng cả device.
- Dùng `40001` thay vì `400001` (xem mục 4): tag vẫn "hợp lệ" nhưng đọc nhầm sang Coil.
- Float/DWord sai giá trị: đổi `OrderBy` giữa `1` và `0`. Driver không hỗ trợ đảo byte trong word.
- `MaxReadTimes` lớn hơn 100 không làm block đọc thưa hơn (bị ép về 10).
- Ghi chỉ dùng FC05, FC06, FC16 (không có FC15).
- Lỗi không có log: mọi lỗi chỉ biểu hiện là tag Bad. Retry đọc/ghi 3 lần, tự reconnect khi lỗi TCP.
- Ký tự không được xuất hiện trong giá trị: `|` (ngăn trường DeviceID), `/` và `-` (ngăn block). Trong tag address `.` chỉ dùng cho bit.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="ModbusTCP_1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\ModbusTCP.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="3600" />
    <Device>
      <DeviceName Value="PLC1" />
      <DeviceID Value="192.168.1.10|502|1|1000|1|10|4-1-1-100" />
      <Tag Name="Run_Cmd" Addrress="000001" Type="Bool" ClientAccess="ReadWrite" Description="Coil 1" />
      <Tag Name="Door_Open" Addrress="100001" Type="Bool" ClientAccess="ReadOnly" Description="Input contact 1" />
      <Tag Name="Temp_Raw" Addrress="300001" Type="Short" ClientAccess="ReadOnly" Description="Input register 1" />
      <Tag Name="Setpoint" Addrress="400001" Type="Word" ClientAccess="ReadWrite" Description="Holding register 1" />
      <Tag Name="Power_kW" Addrress="400011" Type="Float" ClientAccess="ReadWrite" Description="Holding 11-12" />
      <Tag Name="Alarm_Bit3" Addrress="400020.3" Type="Bool" ClientAccess="ReadWrite" Description="Bit 3 of holding 20" />
    </Device>
  </Channel>
</Root>
```
