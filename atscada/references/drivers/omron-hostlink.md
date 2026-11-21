# Omron Host Link (OmronHostLink.dll)

## 1. Driver dùng cho gì + tên DLL

- Đọc/ghi PLC Omron (tài liệu gốc viết cho CP1E) qua cổng **serial** bằng giao thức Host Link. Không có Ethernet.
- DLL: `OmronHostLink.dll` (có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Phần giao thức do thư viện bên thứ ba AdvancedHMI xử lý (`AdvancedHMIDrivers.dll`, `MfgControl.AdvancedHMI.Drivers.dll`). Các DLL này phải nạp được cùng driver; trên máy khảo sát KHÔNG thấy chúng trong thư mục ATDriverServer - nếu driver không chạy, kiểm tra điều này trước.
- Driver có nhiều hạn chế (xem mục 9). Thực tế: **một Channel = một cổng COM = một Device**.

## 2. ChannelAddress

Định dạng: `COMx.BaudRate.DataBits.Parity.StopBits.ResponseTimeout` - **đúng 6 phần**, ngăn cách bằng dấu chấm `.`.

| Thứ tự | Trường | Giá trị hợp lệ | Mặc định UI |
|---|---|---|---|
| 1 | Cổng COM | tên cổng đầy đủ, ví dụ `COM1` | cổng đầu tiên của máy |
| 2 | BaudRate | 300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 56000, 57600, 115200, 128000, 256000 | `9600` |
| 3 | DataBits | `7` hoặc `8` | `7` |
| 4 | Parity | `None`, `Even`, `Odd` (đúng hoa thường) | `Even` |
| 5 | StopBits | `One`, `Two` (đúng hoa thường) | `One` |
| 6 | ResponseTimeout | **bắt buộc là số nguyên**. Không dùng làm timeout thật, nhưng driver vẫn `Convert.ToInt32` phần này ở mỗi lần đọc: thiếu hoặc không phải số -> mọi tag BAD | `10` |

- Ví dụ: `COM1.9600.7.Even.One.10`
- Phải khớp cấu hình cổng Host Link của PLC (Host Link Omron mặc định thường là 9600, 7, Even, 2 stop bit - kiến thức chung, không nằm trong source; kiểm tra trên PLC).

## 3. DeviceID

Định dạng: `DeviceId|TimeBlockRead|LoadFlag|<khối I>|<khối O>|<khối D>|<khối H>` - **đúng 7 phần**, ngăn cách `|`.

| Thứ tự | Trường | Ý nghĩa | Mặc định UI |
|---|---|---|---|
| 1 | DeviceId | Mã thiết bị do người dùng đặt. Driver chỉ dùng để phân biệt Device trong danh sách nội bộ; KHÔNG thấy được truyền xuống làm số trạm (unit number) Host Link - số trạm thực dùng: chưa xác nhận (mặc định của thư viện AdvancedHMI). | `0` |
| 2 | TimeBlockRead | ms; phải là số nguyên. Được parse nhưng lúc chạy không dùng (chu kỳ đọc block cố định khoảng 1000 ms + 500 ms cho mỗi dòng block). | `1000` |
| 3 | LoadFlag | Luôn ghi `1` (cờ để màn hình thiết kế nạp lại form). | `1` |
| 4 | khối I | 5 dòng block vùng I (CIO word 0..99) | |
| 5 | khối O | 5 dòng block vùng O (CIO word >= 100) | |
| 6 | khối D | 5 dòng block vùng D (DM) | |
| 7 | khối H | 5 dòng block vùng H (Holding) | |

Mỗi khối gồm **đúng 5 dòng** ngăn cách bằng `^`; mỗi dòng là `<bật>*<địa chỉ bắt đầu>*<số lượng>` (3 phần ngăn bằng `*`):
- `<bật>`: `1` = dùng, `0` = không dùng.
- `<địa chỉ bắt đầu>`: số word (thập phân, không có tiền tố).
- `<số lượng>`: số word, tối đa 120.
- Dòng không dùng phải viết `0*0*0`. Không được bỏ trống hay viết thiếu dòng.

Khối không dùng block nào: `0*0*0^0*0*0^0*0*0^0*0*0^0*0*0`

Ví dụ DeviceID không khai block nào (mọi tag đọc đơn):

`0|1000|1|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0`

Ví dụ có block I (word 0, 2 word), O (word 100, 2 word), D (D0, 50 word):

`0|1000|1|1*0*2^0*0*0^0*0*0^0*0*0^0*0*0|1*100*2^0*0*0^0*0*0^0*0*0^0*0*0|1*0*50^0*0*0^0*0*0^0*0*0^0*0*0|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0`

## 4. Tag address

Viết HOA. Chỉ các dạng sau được driver đọc được lúc chạy:

| Dạng | Ví dụ | Ý nghĩa |
|---|---|---|
| `<word>.<bit>` | `0.1`, `100.0` | Bit vùng CIO. word < 100 được coi là vùng I, word >= 100 là vùng O. bit 0..15. |
| `H<word>.<bit>` | `H10.5` | Bit vùng Holding. bit 0..15. |
| `D<word>` | `D100` | Word vùng DM (màn hình giới hạn 0..8191). |
| `H<word>` | `H10` | Word vùng Holding (màn hình giới hạn 0..49). |

- Màn hình thiết kế còn chấp nhận `W<word>` (0..99), `W<word>.<bit>` và tiền tố `A`, nhưng lúc chạy driver KHÔNG đọc được các dạng này (`W20.3` gây lỗi chuyển đổi -> BAD; `W20` không có nhánh đọc -> không có giá trị). Không dùng `W`, `A`.
- Không có tiền tố `CIO`, `DM`, `IR`.

## 5. Kiểu dữ liệu

`Type` viết đúng hoa thường.

| Type | Kích thước | Dùng với |
|---|---|---|
| `Bool` | 1 bit trong word 16 bit | chỉ địa chỉ có `.bit` (màn hình tự đặt `Bool` khi địa chỉ có dấu chấm) |
| `Word` | 1 word (0..65535) | `D`, `H` |
| `Short` | 1 word có dấu | `D`, `H` |
| `DWord` | 2 word (uint), word thấp trước | `D`, `H` |
| `Float` | 2 word, word thấp trước | `D`, `H` |
| `Long` | **4 word** (int 64 bit), word thấp trước | `D`, `H` |
| `Double` | 4 word, word thấp trước | `D`, `H` |

- Lưu ý `Long` ở driver này là 64 bit (4 word), khác các driver khác (32 bit). Số nguyên 32 bit có dấu: không có kiểu tương ứng; dùng `DWord` nếu giá trị không âm.
- Địa chỉ `D`/`H` không có `.bit` mà khai `Bool` thì không đọc được; màn hình tự đổi `Bool`/`Default` thành `Word`. Không ghi `Default` vào ATFile.
- Không có scaling, không có tuỳ chọn thứ tự word.
- Giá trị trả về của bit khi đọc ĐƠN (bit không nằm trong block): do thư viện AdvancedHMI trả về, định dạng ("1"/"0" hay "True"/"False") chưa xác nhận. Bit nằm trong block I/O luôn trả `"1"`/`"0"`. Vì vậy nên khai block cho mọi word I/O có tag bit.

## 6. ReadOnly / ReadWrite

- Driver không kiểm tra `ClientAccess`; màn hình luôn đặt `ReadWrite`.
- Ghi bit: nhận `"1"`, `"true"` hoặc `"0"`; giá trị khác trả `Wrong Data`. Driver đọc cả word, sửa bit rồi ghi lại word (ghi 3 lần) -> có thể ghi đè thay đổi của PLC trên các bit khác cùng word.
- Ghi word/nhiều word: theo `Type`. Driver trả `Good` kể cả khi chuyển đổi giá trị lỗi bên trong (lỗi bị nuốt), nên `Good` không bảo đảm đã ghi.
- Vùng I (ngõ vào) nên khai `ReadOnly`.

## 7. Tag hệ thống / đặc biệt

Không có.

## 8. Block read

Khai trong DeviceID (mục 3): 4 vùng I, O, D, H, mỗi vùng 5 dòng.

- Vùng **I**: word CIO 0..99; vùng **O**: word CIO >= 100. Tag bit `<word>.<bit>` có word nằm trong block được lấy từ bộ đệm.
- Vùng **D**: tag `D<word>` nằm trong block được lấy từ bộ đệm. Kiểu nhiều word cần các word kế tiếp cũng nằm trong vùng đọc (driver đọc dư 3 word sau block D).
- Vùng **H**: tag word `H<word>` KHÔNG lấy từ block (luôn đọc đơn). Tag bit `H<word>.<bit>` có nhánh lấy từ block nhưng code tính sai offset ở dòng 1 -> không khai block H; để cả khối H là `0*0*0^...`.
- Các block trong cùng một vùng không nên chồng lấn nhau.
- Số lượng tối đa mỗi dòng: 120. Màn hình thiết kế tự tăng một số giá trị Count (I/O: 5->7, 6, 31, 68, 93, 113, 124 -> +1; D/H: 2->4, 3, 28, 65, 90, 110, 121 -> +1) - lý do không ghi trong source (có vẻ để tránh lỗi độ dài khung). Khi viết tay ATFile, **tránh các giá trị Count này**.
- Chu kỳ: timer nền đọc lần lượt các dòng đang bật, nghỉ 500 ms sau mỗi dòng, rồi lặp lại sau 1000 ms. Càng nhiều dòng bật, dữ liệu càng chậm (5 dòng bật ~ 3,5 giây một vòng).
- Lần đọc đầu tiên driver đọc cả 20 dòng kể cả dòng không bật (dùng địa chỉ/số lượng ghi trong chuỗi), nên dòng không dùng phải là `0*0*0` hợp lệ.
- Khi timer nền đọc lỗi, MỌI tag của driver trả BAD cho đến khi đọc lại thành công.

## 9. Lưu ý / lỗi hay gặp

- Thiếu phần thứ 6 của ChannelAddress hoặc phần đó không phải số -> BAD toàn bộ.
- DeviceID không đủ 7 phần, khối không đủ 5 dòng, dòng không đủ 3 phần -> block không khởi tạo đúng, tag BAD hoặc sai.
- Dấu `.` vừa là phân cách ChannelAddress vừa là phân cách bit trong địa chỉ tag; `|`, `^`, `*` là phân cách DeviceID.
- Trạng thái block dùng chung cho cả driver (một bộ biến cho mọi Device, cờ static dùng chung cả tiến trình): chỉ khai MỘT Device cho mỗi Channel; nhiều Channel Omron trong cùng ATDriver Server có thể không khởi động được timer đọc block cho channel thứ hai (chưa kiểm chứng khi chạy).
- Ngưỡng I/O cứng: word < 100 là I, >= 100 là O. PLC có bố trí CIO khác thì vẫn đọc được bit nhưng phải khai block đúng vùng theo ngưỡng này.
- Tag đọc đơn có trễ 50 ms mỗi tag -> nhiều tag ngoài block sẽ quét chậm.
- PLC phải ở chế độ cổng Host Link (không phải Toolbus/NT Link).
- Bước Connect của driver chỉ gán thông số cổng, không mở cổng (thời điểm thư viện AdvancedHMI mở cổng: chưa xác nhận); cổng sai thường không báo lỗi lúc Connect, chỉ thấy tag BAD.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="Omron" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\OmronHostLink.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="COM1.9600.7.Even.One.10" />
    <Device>
      <DeviceName Value="CP1E" />
      <DeviceID Value="0|1000|1|1*0*2^0*0*0^0*0*0^0*0*0^0*0*0|1*100*2^0*0*0^0*0*0^0*0*0^0*0*0|1*0*50^0*0*0^0*0*0^0*0*0^0*0*0|0*0*0^0*0*0^0*0*0^0*0*0^0*0*0" />
      <Tag Name="Start_Button" Addrress="0.1" Type="Bool" ClientAccess="ReadOnly" Description="Ngo vao CIO 0.01" />
      <Tag Name="Motor" Addrress="100.0" Type="Bool" ClientAccess="ReadWrite" Description="Ngo ra CIO 100.00" />
      <Tag Name="Count" Addrress="D0" Type="Word" ClientAccess="ReadWrite" Description="Bo dem" />
      <Tag Name="Level" Addrress="D2" Type="Short" ClientAccess="ReadOnly" Description="Muc (co dau)" />
      <Tag Name="Temp" Addrress="D10" Type="Float" ClientAccess="ReadOnly" Description="Nhiet do (D10-D11)" />
      <Tag Name="Setpoint" Addrress="H10" Type="Word" ClientAccess="ReadWrite" Description="Gia tri dat (doc don)" />
    </Device>
  </Channel>
</Root>
```
