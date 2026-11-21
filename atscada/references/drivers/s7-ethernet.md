# S7 Ethernet (S7EthernetClient.dll)

## 1. Driver dùng cho gì + tên DLL

- Đọc/ghi PLC Siemens S7 qua Ethernet (S7comm trên TCP/IP, thư viện Sharp7 nhúng sẵn). Vùng nhớ hỗ trợ: DB, M (Merker), Q (Output), I (Input).
- DLL: `S7EthernetClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Kết nối do driver tự mở theo từng Device (IP/Rack/Slot); cổng TCP là cổng S7 chuẩn của Sharp7 (102), không cấu hình được.

## 2. ChannelAddress

Định dạng: `502|<lifetime>` - đúng 2 phần, ngăn cách bằng `|`.

| Thứ tự | Trường | Ý nghĩa | Mặc định |
|---|---|---|---|
| 1 | `502` | Hằng số giữ chỗ. KHÔNG phải cổng kết nối, driver không dùng; getter luôn trả `502`. Luôn ghi `502`. | `502` |
| 2 | lifetime | Thời gian sống của kết nối (giây), số nguyên không âm. | `900` |

- Ví dụ: `502|900`.
- Nếu chuỗi không chứa `|` thì driver tự dùng `502|900`. Nếu phần lifetime không phải số thì dùng 60.
- Luôn viết đủ dạng `502|<số>` trong ATFile.

## 3. DeviceID

Định dạng: `IP|Rack|Slot|MaxReadTimes|BlockSettings` - **đúng 5 phần**, ngăn cách bằng `|`. Thiếu/thừa phần, IP sai định dạng, hoặc Rack/Slot/MaxReadTimes không phải số nguyên thì Device không được tạo và mọi tag BAD (không có thông báo lỗi).

| Thứ tự | Trường | Ý nghĩa | Mặc định UI |
|---|---|---|---|
| 1 | IP | IPv4 của PLC. Octet đầu phải từ 1-255 (không bắt đầu bằng 0). | `192.168.1.1` |
| 2 | Rack | Số rack. | `0` |
| 3 | Slot | Số slot CPU. | `1` |
| 4 | MaxReadTimes | Số lần gọi đọc tag giữa hai lần đọc lại các block (xem mục 8). Bắt buộc là số nguyên kể cả khi không dùng block. | `1000` |
| 5 | BlockSettings | Danh sách block đọc gộp, ngăn cách `/`. Có thể để rỗng, nhưng dấu `|` trước nó vẫn phải có. | rỗng |

- Ví dụ không có block: `192.168.1.10|0|1|1000|`
- Ví dụ có block: `192.168.1.10|0|1|50|DB-1-1-0-99/MB-1-0-15`
- Rack/Slot theo dòng PLC (kiến thức chung về S7, không nằm trong source driver): S7-1200/1500 thường `0|1`, S7-300 thường `0|2`.
- Các Device có cùng `IP-Rack-Slot` dùng chung một kết nối.

## 4. Tag address

Không phân biệt hoa thường khi chạy (driver tự `ToUpper()`), nhưng nên viết HOA. Không có khoảng trắng.

| Vùng | Địa chỉ byte | Địa chỉ bit | Ghi chú |
|---|---|---|---|
| Data Block | `DB<n>[<byte>]` ví dụ `DB1[0]` | `DB<n>[<byte>].<bit>` ví dụ `DB1[4].2` | n = số DB, byte = offset byte trong DB |
| Merker (M) | `MB[<byte>]` ví dụ `MB[10]` | `MB[<byte>].<bit>` ví dụ `MB[10].0` | |
| Output (Q) | `QB[<byte>]` ví dụ `QB[0]` | `QB[<byte>].<bit>` ví dụ `QB[0].1` | |
| Input (I) | `IB[<byte>]` ví dụ `IB[0]` | `IB[<byte>].<bit>` ví dụ `IB[0].7` | |

- Bit chỉ từ `0` đến `7`.
- Tiền tố luôn là `DB`, `MB`, `QB`, `IB` kèm ngoặc vuông. KHÔNG dùng cú pháp Siemens kiểu `DB1.DBW0`, `M10.0`, `MW10`, `Q0.1`.
- Số trong ngoặc luôn là offset **byte**, kể cả với Word/DWord/Float (ví dụ `MB[10]` kiểu Word = MW10; `DB1[4]` kiểu Float = DB1.DBD4).

## 5. Kiểu dữ liệu

Giá trị `Type` trong ATFile (driver so sánh không phân biệt hoa thường): 

| Type | Số byte | Tương ứng S7 | Dùng với |
|---|---|---|---|
| `Bool` | 1 byte (lấy 1 bit) | BOOL | chỉ địa chỉ bit (`...].<bit>`) |
| `Byte` | 1 | BYTE (0-255) | địa chỉ byte |
| `Word` | 2 | WORD (ushort) | địa chỉ byte |
| `Short` | 2 | INT (short) | địa chỉ byte |
| `DWord` | 4 | DWORD (uint) | địa chỉ byte |
| `Long` | 4 | DINT (int 32 bit) | địa chỉ byte |
| `Float` | 4 | REAL | địa chỉ byte |
| `Double` | 8 | LREAL | địa chỉ byte |

- Thứ tự byte: big-endian chuẩn S7 (hàm Sharp7), không có tuỳ chọn đảo byte, không có scaling.
- Không hỗ trợ String, mảng.
- `Default` chỉ là lựa chọn trong màn hình thiết kế (tự đổi thành `Byte` hoặc `Bool` khi bấm Check). **Không ghi `Default` vào ATFile**: lúc chạy driver không hiểu `Default` (kích thước 0) và tag sẽ BAD.
- Địa chỉ bit phải đi với `Bool`; địa chỉ byte không được đi với `Bool`.

## 6. ReadOnly / ReadWrite

- Driver không kiểm tra `ClientAccess`; màn hình thiết kế luôn đặt `ReadWrite` cho mọi tag.
- Có thể ghi `ReadOnly` trong ATFile để ATDriver Server chặn ghi (việc chặn do server, không do driver).
- Ghi `Bool`: chỉ nhận `"1"` hoặc `"0"`; driver đọc byte hiện tại, đổi bit rồi ghi lại cả byte.
- Ghi số: giá trị phải parse được theo đúng kiểu (ví dụ Word 0..65535), sai thì trả `Bad`.
- Vùng `IB` (Input) về bản chất PLC sẽ ghi đè lại; nên khai `ReadOnly`.

## 7. Tag hệ thống / đặc biệt

Không có.

## 8. Block read (đọc gộp)

Khai trong phần thứ 5 của DeviceID, các block ngăn cách bằng `/`:

| Vùng | Cú pháp một block | Số phần (ngăn bằng `-`) | Ví dụ |
|---|---|---|---|
| DB | `DB-<vị trí>-<DBNumber>-<From>-<To>` | đúng 5 | `DB-1-10-0-99` (DB10, byte 0..99) |
| M / Q / I | `MB-<vị trí>-<From>-<To>`, `QB-...`, `IB-...` | đúng 4 | `MB-1-0-63` |

- `<vị trí>`: số dòng trong màn hình thiết kế (1..10 cho mỗi vùng). Lúc chạy driver không dùng giá trị này, nhưng phải có và nên là số 1..10, không trùng nhau trong cùng vùng để màn hình thiết kế nạp lại được.
- `From`, `To`: offset byte, `From <= To`. Block sai số phần hoặc `From > To` bị bỏ qua (tag trong vùng đó sẽ đọc đơn).
- Tag nằm **trọn** trong một block (từ byte đầu đến byte cuối của kiểu dữ liệu) lấy giá trị từ bộ đệm block. Tag ngoài block được đọc đơn trực tiếp từ PLC.
- `MaxReadTimes`: các block được đọc lại sau mỗi `MaxReadTimes` lần gọi đọc tag của Device đó. Đặt bằng số tag của Device thì mỗi vòng quét Device sẽ làm mới block một lần. Đặt quá lớn (ví dụ để mặc định 1000 với Device chỉ 20 tag) thì giá trị trong block chậm cập nhật.
- Nếu block đọc lỗi, mọi tag trong block đó BAD.
- Giới hạn kích thước một block phụ thuộc PDU của PLC: chưa xác nhận con số cụ thể từ source; nên giữ block vừa phải (ví dụ <= 200 byte) nếu gặp lỗi.

## 9. Lưu ý / lỗi hay gặp

- Sai số phần của DeviceID (không đủ 5 phần, quên dấu `|` cuối khi không có block) -> Device không khởi tạo, tất cả tag BAD.
- Dùng cú pháp Siemens (`DB1.DBW0`, `M0.0`) -> tag BAD. Phải dùng `DB1[0]`, `MB[0].0`.
- Ghi `Type="Default"` vào ATFile -> BAD.
- Ký tự `|`, `/`, `-` là dấu phân cách trong DeviceID; không dùng vào mục đích khác.
- Trong màn hình thiết kế, tab QB của Read Block Setting có lỗi (không tạo được block QB từ giao diện). Block `QB-...` viết tay trong ATFile vẫn được driver xử lý khi chạy.
- PLC S7-1200/1500 phải bật "Permit access with PUT/GET" và DB phải tắt "Optimized block access" thì mới đọc được theo offset (kiến thức chung về S7, không nằm trong source driver).
- Driver thử lại 2 lần cho kết nối/đọc/ghi; lỗi TCP thì tự ngắt và kết nối lại.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="S7" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\S7EthernetClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="502|900" />
    <Device>
      <DeviceName Value="PLC1" />
      <DeviceID Value="192.168.1.10|0|1|6|DB-1-1-0-99/MB-1-0-15" />
      <Tag Name="Run" Addrress="DB1[0].0" Type="Bool" ClientAccess="ReadWrite" Description="Lenh chay" />
      <Tag Name="Status" Addrress="DB1[1]" Type="Byte" ClientAccess="ReadOnly" Description="Trang thai" />
      <Tag Name="Speed" Addrress="DB1[2]" Type="Short" ClientAccess="ReadWrite" Description="Toc do dat (INT)" />
      <Tag Name="Counter" Addrress="DB1[4]" Type="Long" ClientAccess="ReadOnly" Description="Bo dem (DINT)" />
      <Tag Name="Temp" Addrress="DB1[8]" Type="Float" ClientAccess="ReadOnly" Description="Nhiet do (REAL)" />
      <Tag Name="Alarm" Addrress="MB[10].3" Type="Bool" ClientAccess="ReadOnly" Description="M10.3" />
    </Device>
  </Channel>
</Root>
```
