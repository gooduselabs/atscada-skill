# Modbus RTU (ModbusRTU.dll)

## 1. Driver dùng cho gì + tên DLL

- ATSCADA làm Modbus RTU master qua cổng COM (RS-232/RS-485), đọc/ghi Coil, Input Contact, Input Register, Holding Register.
- DLL: `ModbusRTU.dll` (có trong thư mục cài `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Mỗi Channel = một cổng COM. Mọi Device (slave) trong Channel dùng chung cổng đó.

## 2. ChannelAddress

Đúng **6 trường**, phân tách bằng dấu chấm `.`. Sai số trường hoặc một trường không parse được thì không mở được cổng, mọi tag Bad.

```
PortName.BaudRate.DataBits.Parity.StopBits.Timeout
```

| # | Trường | Ý nghĩa | Giá trị hợp lệ | Ví dụ |
|---|---|---|---|---|
| 1 | PortName | Tên cổng COM (UI yêu cầu bắt đầu bằng `COM`) | `COM1`, `COM3`... | `COM3` |
| 2 | BaudRate | Số nguyên | UI: 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 56000, 57600, 115200, 128000, 256000 | `9600` |
| 3 | DataBits | Số nguyên | `7` hoặc `8` | `8` |
| 4 | Parity | Tên enum, **phân biệt hoa thường** | `None`, `Odd`, `Even` (UI); enum còn có `Mark`, `Space` | `None` |
| 5 | StopBits | Tên enum, **phân biệt hoa thường** | `One`, `Two` (UI); enum còn có `OnePointFive` | `One` |
| 6 | Timeout | ms, dùng cho cả đọc và ghi cổng | UI mặc định `1000` | `1000` |

- Mặc định UI của BaudRate/DataBits/Parity/StopBits lấy theo cổng COM đang chọn trên máy (thường 9600/8/None/One).
- Viết `N`, `none`, `1` cho Parity/StopBits kiểu rút gọn là sai; phải là `None`, `One`.
- Không có tham số Lifetime ở đây (driver tự mở lại cổng sau 3600 s).

## 3. DeviceID

Đúng **4 trường**, phân tách bằng `|`. Sai số trường thì device bị bỏ qua, mọi tag Bad.

```
UnitID|OrderBy|MaxReadTimes|BlockSettings
```

| # | Trường | Ý nghĩa | Mặc định UI | Ví dụ |
|---|---|---|---|---|
| 1 | UnitID | Địa chỉ slave, 0..255 (lớn hơn 255 là device không hợp lệ dù UI cho nhập) | `1` | `1` |
| 2 | OrderBy | Thứ tự word cho kiểu 32/64-bit: `1` = word đầu là word cao, `0` = word đầu là word thấp | `1` | `1` |
| 3 | MaxReadTimes | Số lần gọi đọc tag giữa hai lượt đọc block. **Không bị ép giá trị** (khác Modbus TCP) | `1000` | `20` |
| 4 | BlockSettings | Danh sách block đọc gộp, **được phép rỗng** nhưng dấu `|` trước nó vẫn phải có | rỗng | `4-1-1-100` |

Ví dụ không block: `1|1|1000|` (kết thúc bằng `|`).
Ví dụ có block: `1|1|20|4-1-1-100/3-1-1-20`.

## 4. Tag address

Giống hệt Modbus TCP: địa chỉ 6 chữ số, chữ số đầu chọn vùng nhớ, driver tự thêm 0 bên trái cho đủ 6 chữ số.

| Địa chỉ | Vùng | Function code | Offset gửi đi |
|---|---|---|---|
| `000001`..`099999` (viết `1`..`99999` cũng được) | Coil | đọc FC01, ghi FC05 | địa chỉ - 1 |
| `100001`..`199999` | Input Contact | FC02 | địa chỉ - 100001 |
| `300001`..`399999` | Input Register | FC04 | địa chỉ - 300001 |
| `400001`..`499999` | Holding Register | đọc FC03, ghi **luôn FC16** (kể cả 1 thanh ghi) | địa chỉ - 400001 |

- **Bit trong thanh ghi** (chỉ vùng 3 và 4): thêm `.0`..`.15`, kiểu bắt buộc `Bool`. Ví dụ `400010.3`.
- Không có hậu tố nào khác.
- **Bẫy 5 chữ số**: `40001` KHÔNG phải Holding Register 1 mà là Coil 40001. Vùng 1/3/4 phải viết đủ 6 chữ số: `400001`, `300001`, `100001`.
- Thanh ghi số 0 không tồn tại (`400000` không hợp lệ).

Ví dụ: `000010` Bool; `300005` Word; `400001` Float; `400100` DWord; `400020.5` Bool.

## 5. Kiểu dữ liệu

| Type | Số thanh ghi 16-bit | Ghi chú |
|---|---|---|
| `Bool` | 1 bit (Coil/Input Contact) hoặc 1 thanh ghi + `.bit` | `0`/`1` |
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
  - Vùng 3/4 có `.bit`: chỉ `Bool`.
  - Vùng 3/4 không có `.bit`: không được `Bool`.
- Byte trong word big-endian; thứ tự word theo `OrderBy` của Device. Không scaling, không String/BCD.

## 6. ReadOnly / ReadWrite

| Vùng | ClientAccess đúng |
|---|---|
| Coil (0xxxxx) | `ReadWrite` |
| Input Contact (1xxxxx) | `ReadOnly` |
| Input Register (3xxxxx) | `ReadOnly` |
| Holding Register (4xxxxx) | `ReadWrite` |

- Driver tự từ chối ghi vào vùng 1/3 (trả `Bad`) bất kể ClientAccess khai gì.
- Ghi Coil chỉ nhận `0` hoặc `1`. Ghi bit thanh ghi là đọc - sửa bit - ghi lại.

## 7. Tag hệ thống / đặc biệt

Không có.

## 8. Block read

`BlockSettings` (trường 4 của DeviceID) = các block cách nhau bởi `/`, mỗi block:

```
Area-Position-From-To
```

| Phần | Ý nghĩa |
|---|---|
| Area | `0` = Coil, `1` = Input Contact, `3` = Input Register, `4` = Holding Register |
| Position | Số thứ tự ô trên giao diện, `1`..`10` cho mỗi Area. Runtime không dùng, nhưng màn hình sửa Device cần 1..10 và không trùng trong cùng Area |
| From, To | Số thứ tự **1-based không kèm tiền tố vùng** (1..99999), `From <= To`. Holding `400001..400100` viết `4-1-1-100` |

- Block lớn được tự chia: tối đa 2000 bit hoặc 125 thanh ghi mỗi lần đọc.
- Tag nằm trọn trong một block con thì lấy từ buffer; ngoài block thì đọc riêng (mỗi tag một frame, chậm trên RS-485).
- Block chỉ được đọc lại sau `MaxReadTimes + 1` lần gọi đọc tag (lần đầu đọc ngay). **Giá trị mặc định 1000 làm dữ liệu block rất cũ** nếu device ít tag: đặt `MaxReadTimes` bằng số tag của device để mỗi vòng quét đọc block một lần.
- Lượt đọc block thất bại (sau 5 lần thử) thì mọi tag trong block đó Bad.

## 9. Lưu ý / lỗi hay gặp

- ChannelAddress dùng `.` làm separator, DeviceID dùng `|`: đừng lẫn với Modbus TCP (ChannelAddress chỉ là một số).
- DeviceID thiếu `|` cuối khi không có block (chỉ 3 trường) là hỏng device.
- `Parity`/`StopBits` sai chữ hoa thường là không mở được cổng.
- Dùng `40001` thay vì `400001`: đọc nhầm sang Coil.
- Slave chỉ hỗ trợ FC06 sẽ từ chối lệnh ghi vì driver luôn ghi thanh ghi bằng FC16.
- Float/DWord sai giá trị: đổi `OrderBy`. Không hỗ trợ đảo byte trong word.
- Hai Channel không thể dùng chung một cổng COM.
- Lỗi không có log; chỉ thấy tag Bad.
- Ký tự không được xuất hiện trong giá trị: `.` (ngăn trường ChannelAddress), `|` (ngăn trường DeviceID), `/` và `-` (ngăn block).

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="ModbusRTU_COM3" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\ModbusRTU.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="COM3.9600.8.None.One.1000" />
    <Device>
      <DeviceName Value="Meter1" />
      <DeviceID Value="1|1|5|4-1-1-20" />
      <Tag Name="Voltage" Addrress="400001" Type="Float" ClientAccess="ReadWrite" Description="Holding 1-2" />
      <Tag Name="Current" Addrress="400003" Type="Float" ClientAccess="ReadWrite" Description="Holding 3-4" />
      <Tag Name="Status_Word" Addrress="400010" Type="Word" ClientAccess="ReadWrite" Description="Holding 10" />
      <Tag Name="Fault_Bit0" Addrress="400010.0" Type="Bool" ClientAccess="ReadWrite" Description="Bit 0 of holding 10" />
      <Tag Name="Relay1" Addrress="000001" Type="Bool" ClientAccess="ReadWrite" Description="Coil 1" />
    </Device>
    <Device>
      <DeviceName Value="Meter2" />
      <DeviceID Value="2|1|1000|" />
      <Tag Name="Energy" Addrress="300001" Type="DWord" ClientAccess="ReadOnly" Description="Input register 1-2" />
    </Device>
  </Channel>
</Root>
```
