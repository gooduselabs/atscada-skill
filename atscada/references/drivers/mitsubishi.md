# Mitsubishi (MitsubishiEthernet.dll và MitsubishiSerial.dll)

## 1. Driver dùng cho gì + tên DLL

Có HAI driver riêng, định dạng ChannelAddress/DeviceID khác hẳn nhau. Chọn đúng DLL trước khi viết ATFile.

| DLL | Đường truyền | Giao thức | PLC |
|---|---|---|---|
| `MitsubishiEthernet.dll` | TCP/IP | MC Protocol (frame 1E hoặc 3E) | FX3U + module Ethernet, dòng Q/QnA/L/iQ-R, FX5 |
| `MitsubishiSerial.dll` | Cổng COM (RS-232/RS-422) | Giao thức cổng lập trình FX | FX qua cổng lập trình |

Cả hai DLL đều có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`.

**Cảnh báo phiên bản (MitsubishiEthernet.dll):** tài liệu này mô tả theo source mới. Bản DLL cài sẵn trên máy khảo sát là bản build cũ hơn và chỉ chứa các tên dòng PLC `FX3U`, `QnA Series` (và `A Series`); các tên khác (`Q Series`, `FX5U`, `iQ-R Series`...) chỉ có trong bản build mới. Để chạy được với mọi bản, ưu tiên dùng `FX3U` (frame 1E) hoặc `QnA Series` (frame 3E). Cách bản cũ hiểu số X/Y: chưa xác nhận.

---

# PHẦN A - MitsubishiEthernet.dll

## A2. ChannelAddress

Một giá trị duy nhất, không có dấu phân cách: **tên dòng PLC**, viết đúng từng ký tự (phân biệt hoa thường, có khoảng trắng).

| Giá trị | Frame MC | Số X/Y |
|---|---|---|
| `FX3U`, `FX3UC`, `FX3G`, `FX3S`, `FX2N`, `FX1N` | 1E | bát phân |
| `FX5U`, `FX5UC`, `FX5UJ` | 3E | bát phân |
| `QnA Series`, `Q Series`, `L Series`, `iQ-R Series` | 3E | thập lục phân |

- Mặc định màn hình thiết kế: `QnA Series`. Giá trị không nhận ra -> frame 1E, X/Y thập lục phân.
- Ví dụ: `FX3U`

## A3. DeviceID

Định dạng: `IpAddress|Port|Timeout|ReadBlockRate|BlockSetting` - **5 phần**, ngăn cách `|`. Thiếu phần thứ 5 (kể cả khi rỗng thì vẫn phải có dấu `|` cuối) -> mọi tag BAD.

| Thứ tự | Trường | Ý nghĩa | Mặc định UI |
|---|---|---|---|
| 1 | IpAddress | IPv4 của PLC/module Ethernet | `192.168.1.1` |
| 2 | Port | Cổng TCP (0-65535). Không phải số -> BAD | `8000` |
| 3 | Timeout | ms, số nguyên không âm. Không phải số -> BAD | `1000` |
| 4 | ReadBlockRate | Chu kỳ đọc lại các block, ms. Nhỏ hơn 10 hoặc không phải số -> dùng 100 | `900` |
| 5 | BlockSetting | Các block đọc gộp, ngăn cách `/`; có thể rỗng | rỗng |

- Ví dụ không block: `192.168.1.10|8000|1000|900|`
- Ví dụ có block: `192.168.1.10|8000|1000|900|X-1-0-16/Y-1-0-16/M-1-0-64/D-1-0-100`
- Port phải khớp cấu hình MC Protocol trên PLC/module (không có giá trị chuẩn cố định; 8000 chỉ là mặc định của màn hình).

## A4. Tag address

Dạng `<Vùng><Số>`, viết HOA, không khoảng trắng, không có cú pháp `.bit`.

| Vùng | Ví dụ | Hệ số của phần số | Loại |
|---|---|---|---|
| `X` | `X0`, `X17` (FX), `X1F` (Q/L) | bát phân với FX/FX5, thập lục với QnA/Q/L/iQ-R | bit |
| `Y` | `Y0`, `Y17`, `Y1F` | như X | bit |
| `M` | `M100` | thập phân | bit |
| `D` | `D200` | thập phân | word |

- Với dòng FX, `X8`, `X9`, `Y18`... là sai (chữ số bát phân chỉ 0-7).
- Màn hình thiết kế chỉ cho tạo `X`, `Y`, `M`, `D`. Trong source, lúc chạy còn phân tích được các tiền tố khác (`SM`, `SD`, `R`, `ZR`, `W`, `B`, `L`, `F`, `V`, `TN`, `CN`...; `S` đơn lẻ KHÔNG phân tích được), nhưng cách đọc/ghi các vùng này chưa xác nhận - không dùng trừ khi đã thử thực tế.

## A5. Kiểu dữ liệu

`Type` phải viết đúng hoa thường như bảng (driver so sánh chính xác).

| Type | Kích thước | Dùng với |
|---|---|---|
| `Bool` | 1 điểm | `X`, `Y`, `M` (giá trị "1"/"0") |
| `Word` | 1 word (ushort) | `D` |
| `Short` | 1 word (short) | `D` |
| `DWord` | 2 word (uint) | `D` (D100 chiếm D100..D101) |
| `Long` | 2 word (int 32 bit) | `D` |
| `Float` | 2 word | `D` |
| `Double` | 4 word | `D` |

- Giá trị nhiều word: word thấp ở địa chỉ thấp (little-endian), cố định, không có tuỳ chọn. Không có scaling.
- `D` không dùng được với `Bool`. `X`/`Y`/`M` luôn khai `Bool`.
- Không ghi `Default` vào ATFile (lúc chạy `Default` trên `D` có độ dài 0 -> BAD). Màn hình thiết kế tự đổi `Default` thành `Word`/`Bool`.

## A6. ReadOnly / ReadWrite

- Driver không kiểm tra `ClientAccess`; màn hình luôn đặt `ReadWrite`. Có thể khai `ReadOnly` để server chặn ghi.
- Ghi `X`/`Y`/`M`: chỉ nhận `"1"` hoặc `"0"`. Ghi `D`: giá trị phải parse được theo `Type`. Kết quả `Good` / `Bad` / `Write error.`.
- `X` là ngõ vào vật lý, nên khai `ReadOnly`.

## A7. Tag hệ thống / đặc biệt

Không có.

## A8. Block read

Mỗi block: `<Vùng>-<Vị trí>-<From>-<Count>` - đúng 4 phần ngăn bằng `-`; các block ngăn bằng `/`.

- `<Vùng>`: `X`, `Y`, `M`, `D`. `<Vị trí>`: số dòng trong màn hình (1..10 mỗi vùng), không trùng trong cùng vùng.
- `<From>`: viết như phần số của tag (X/Y theo bát phân hoặc thập lục tuỳ dòng PLC; M/D thập phân).
- `<Count>`: số điểm với X/Y/M, số word với D. Phải > 0.
- X/Y được đọc theo word 16 điểm; driver tự nới block xuống ranh giới 16.
- Tag nằm trọn trong block lấy từ bộ đệm (đọc lại sau mỗi `ReadBlockRate` ms). Tag ngoài block được đọc đơn từng tag.
- Giới hạn mỗi yêu cầu (driver tự chia nếu block lớn hơn): frame 1E 256 bit / 64 word; frame 3E 3584 bit / 960 word.
- Block lỗi chỉ làm BAD các tag của block đó; block bị timeout sẽ nghỉ `max(5000, Timeout*5)` ms rồi mới thử lại.

## A9. Lưu ý / lỗi hay gặp

- Sai tên dòng PLC (ví dụ `Fx3u`, `Q series`) -> driver coi là dòng lạ: frame 1E và X/Y thập lục.
- FX3U cần module/adapter Ethernet hỗ trợ MC Protocol frame 1E; FX1N/FX2N chỉ chạy nếu module nói được 1E.
- Thiếu dấu `|` cuối khi không có block -> tất cả BAD.
- `-`, `/`, `|` là dấu phân cách, không dùng trong giá trị.
- Mỗi cặp IP+Port dùng một kết nối TCP.

## A10. ATFile mẫu (Ethernet)

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MitsuEth" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\MitsubishiEthernet.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="FX3U" />
    <Device>
      <DeviceName Value="PLC1" />
      <DeviceID Value="192.168.1.10|8000|1000|900|X-1-0-16/Y-1-0-16/M-1-0-64/D-1-0-100" />
      <Tag Name="Start_Button" Addrress="X0" Type="Bool" ClientAccess="ReadOnly" Description="Nut start" />
      <Tag Name="Motor" Addrress="Y17" Type="Bool" ClientAccess="ReadWrite" Description="Dong co (Y17 bat phan)" />
      <Tag Name="Auto_Mode" Addrress="M10" Type="Bool" ClientAccess="ReadWrite" Description="Che do auto" />
      <Tag Name="Count" Addrress="D0" Type="Word" ClientAccess="ReadWrite" Description="Bo dem" />
      <Tag Name="Temp" Addrress="D10" Type="Float" ClientAccess="ReadOnly" Description="Nhiet do (D10-D11)" />
    </Device>
  </Channel>
</Root>
```

---

# PHẦN B - MitsubishiSerial.dll

## B2. ChannelAddress

Định dạng: `COMx.Baud.DataBits.Parity.StopBits.ResponseTimeout` - **6 phần**, ngăn cách bằng dấu chấm `.`.

| Thứ tự | Trường | Giá trị hợp lệ | Mặc định UI |
|---|---|---|---|
| 1 | Cổng COM | `COM1`, `COM7`... (driver bỏ 3 ký tự đầu để lấy số cổng, nên phải bắt đầu đúng bằng `COM`) | cổng đầu tiên của máy |
| 2 | Baud | 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 56000, 57600, 115200, 128000, 256000 | `115200` |
| 3 | DataBits | `7` hoặc `8` | `7` |
| 4 | Parity | `None`, `Even`, `Odd` (đúng hoa thường) | `Even` |
| 5 | StopBits | `One`, `Two` (đúng hoa thường) | `One` |
| 6 | ResponseTimeout | ms; được lưu nhưng lúc chạy KHÔNG dùng (timeout thực luôn 1000 ms) | `1000` |

- Ví dụ: `COM7.115200.7.Even.One.1000`
- Cổng lập trình FX thường là 9600/7/Even/One (kiến thức chung, không nằm trong source); phải khớp cấu hình thực của PLC.
- Lúc chạy driver chỉ đọc 5 phần đầu; vẫn ghi đủ 6 phần như màn hình thiết kế tạo ra.

## B3. DeviceID

Định dạng: `ReadBlockRate|BlockSetting` - **2 phần**, ngăn cách `|`. Không có IP/port/số trạm.

| Thứ tự | Trường | Ý nghĩa | Mặc định UI |
|---|---|---|---|
| 1 | ReadBlockRate | Chu kỳ đọc lại block, ms; nhỏ hơn 10 -> dùng 100 | `900` |
| 2 | BlockSetting | Các block ngăn cách `/`; có thể rỗng nhưng dấu `|` bắt buộc | rỗng |

- Ví dụ: `900|` hoặc `900|X-1-0-16/M-1-0-64/D-1-0-50`
- Mỗi Channel chỉ có một bộ đọc block và một cổng COM: thực tế **một Device cho mỗi Channel**.

## B4. Tag address

Viết HOA (chữ thường làm lỗi khi ghi và khi tra block).

| Vùng | Ví dụ | Phần số | Loại |
|---|---|---|---|
| `X` | `X0`, `X10`, `X17` | bát phân (chữ số 0-7) | bit |
| `Y` | `Y0`, `Y10` | bát phân | bit |
| `M` | `M10` | thập phân | bit |
| `D` | `D100` | thập phân | word |

- Màn hình chỉ cho `X`, `Y`, `M`, `D`. Source có enum `S`, `T`, `C` nhưng đọc các vùng này chưa xác nhận; `S`, `T`, `C` không ghi được.
- Không có cú pháp `.bit`.

## B5. Kiểu dữ liệu

`Type` viết đúng hoa thường.

| Type | Kích thước | Dùng với | Ghi chú |
|---|---|---|---|
| `Bool` | 1 bit | `X`, `Y`, `M` | "1"/"0" |
| `Word` | 1 word | `D` | |
| `Short` | 1 word | `D` | |
| `DWord` | 2 word | `D` | |
| `Float` | 2 word | `D` | |
| `Double` | 4 word | `D` | |
| `Long` | 2 word (int 32 bit) | `D` | Chỉ đọc đúng khi tag nằm trong một read block. Ngoài block driver chỉ yêu cầu 1 byte nên kết quả sai/BAD. Tránh dùng, hoặc bắt buộc khai block chứa tag. |

- `D` không dùng với `Bool`. Không ghi `Default` vào ATFile. Không có scaling.

## B6. ReadOnly / ReadWrite

- Driver không kiểm tra `ClientAccess`; màn hình luôn đặt `ReadWrite`.
- Ghi `X`/`Y`/`M`: chỉ `"1"` (Force ON) hoặc `"0"` (Force OFF). Ghi `D`: theo `Type` (Word/Short/Long/DWord/Float/Double). Kết quả `Good`/`Bad`/`Write error.`.

## B7. Tag hệ thống / đặc biệt

Không có.

## B8. Block read

Mỗi block: `<Vùng>-<Vị trí>-<From>-<Count>` (4 phần, `-`), các block ngăn bằng `/`.

- `<Vùng>`: `X`, `Y`, `M`, `D`; `<Vị trí>` 1..10 mỗi vùng.
- `<From>`: số viết như phần số của tag (X/Y: chữ số hàng đơn vị <= 7).
- `<Count>`: X/Y/M tính bằng bit, tối đa 2016; D tính bằng word, tối đa 126. Phải > 0.
- Với `D`, word CUỐI của block không được coi là nằm trong block (điều kiện kiểm tra chặt hơn một đơn vị) và sẽ được đọc đơn. Khai `Count` dư ít nhất 1 word so với tag cuối (dư bằng số word của kiểu dữ liệu tag cuối cho chắc).
- Tag ngoài block được đọc đơn, mỗi tag một lệnh (chậm trên serial) -> nên khai block cho mọi tag.

## B9. Lưu ý / lỗi hay gặp

- `Parity`/`StopBits` sai chính tả (ví dụ `even`, `1`) -> không mở được cổng.
- Tên cổng không bắt đầu bằng `COM` + số -> lỗi.
- Dấu `.` là dấu phân cách ChannelAddress; `|`, `/`, `-` là dấu phân cách DeviceID.
- Khi một lần đọc thất bại, lần đọc sau driver đóng cổng, chờ 1 giây rồi mở lại (phục hồi khi PLC mất nguồn) -> khi mất kết nối vòng quét rất chậm.
- Cổng COM đang bị phần mềm khác (GX Works...) giữ thì driver không đọc được.

## B10. ATFile mẫu (Serial)

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MitsuSerial" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\MitsubishiSerial.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="COM3.9600.7.Even.One.1000" />
    <Device>
      <DeviceName Value="FX1" />
      <DeviceID Value="900|X-1-0-16/Y-1-0-16/M-1-0-64/D-1-0-50" />
      <Tag Name="Start_Button" Addrress="X0" Type="Bool" ClientAccess="ReadOnly" Description="Nut start" />
      <Tag Name="Motor" Addrress="Y10" Type="Bool" ClientAccess="ReadWrite" Description="Dong co" />
      <Tag Name="Auto_Mode" Addrress="M10" Type="Bool" ClientAccess="ReadWrite" Description="Che do auto" />
      <Tag Name="Count" Addrress="D0" Type="Word" ClientAccess="ReadWrite" Description="Bo dem" />
      <Tag Name="Temp" Addrress="D10" Type="Float" ClientAccess="ReadOnly" Description="Nhiet do (D10-D11)" />
    </Device>
  </Channel>
</Root>
```
