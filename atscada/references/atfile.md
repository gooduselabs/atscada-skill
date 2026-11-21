# Bước 1 - ATFile (cho ATDriver Server)

Mục tiêu: người dùng mở ATDriver Server, Open file là chạy, tag lên Good.

Mục lục: cấu trúc · quy tắc bắt buộc · kiểu dữ liệu và quyền ghi · tổ chức kênh/thiết bị · Internal Memory · khai báo trong `model.js` · kiểm tra · tag Bad thì xem gì

## Cấu trúc

File thật ghi liền một dòng, UTF-8 có BOM (xuống dòng cho dễ đọc cũng được):

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="TenChannel" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\<Driver>.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="<chuỗi theo driver>" />
    <Device>
      <DeviceName Value="TenDevice" />
      <DeviceID Value="<chuỗi theo driver>" />
      <Tag Name="TenTag" Addrress="<địa chỉ theo driver>" Type="Float" ClientAccess="ReadOnly" Description="mô tả" />
    </Device>
  </Channel>
</Root>
```

## Quy tắc bắt buộc

- Thuộc tính địa chỉ của tag viết là **`Addrress`** (ba chữ r). Đây là cách viết của chính chương trình; sửa "cho đúng chính tả" là hỏng file.
- ATDriver Server đọc thuộc tính của `<Tag>` **theo vị trí**, không theo tên. Luôn đúng thứ tự `Name`, `Addrress`, `Type`, `ClientAccess`, `Description`, và luôn đủ cả năm (Description rỗng thì ghi `""`).
- Thứ tự phần tử trong `<Channel>` cố định: `ChannelName`, `ChannelDriverLocation`, `ChannelRate`, `ChannelMaxWTimes`, `ChannelAddress`, rồi mới tới các `<Device>`. `ChannelRate` làm chương trình nạp DLL, `ChannelAddress` làm nó kết nối, nên đảo thứ tự là lỗi.
- `ChannelDriverLocation` trỏ tới DLL có thật trong thư mục `Drivers` của ATDriver Server. Tên DLL lấy từ `references/drivers/_index.md`; trên máy có cài thì liệt kê thư mục để chắc (script `scripts/find-atscada.ps1` in danh sách này). Đường dẫn mặc định là `C:\Program Files\ATPro\ATDriverServer\Drivers\`; máy chạy thật cài ở chỗ khác thì ghi theo máy đó.
- `ChannelRate` (ms, chu kỳ quét) mặc định 1000; `ChannelMaxWTimes` mặc định 10. Chỉ đổi khi người dùng yêu cầu, hoặc khi file driver khuyên (driver gửi một request cho mỗi tag như BACnet, SNMP thì tăng `ChannelRate` khi nhiều tag).
- Tên Channel, Device, Tag: chữ không dấu, số, gạch dưới. **Không dấu chấm**, không dấu cách, không ký tự đặc biệt.
- Giá trị thuộc tính phải escape XML (`&` thành `&amp;`, `<` thành `&lt;`, `"` thành `&quot;`). Hay gặp ở mật khẩu MQTT và body của driver HTTP. Dùng thư viện hoặc hàm escape, không gõ tay.
- **Số trường và ký tự phân cách của `ChannelAddress`, `DeviceID`, địa chỉ tag phải đúng tuyệt đối** theo file driver. Sai thì driver thường không báo lỗi, chỉ cho mọi tag Bad. Trường cuối rỗng vẫn phải giữ ký tự phân cách (ví dụ Modbus TCP `192.168.1.10|502|1|1000|1|10|`). Không driver nào hỗ trợ escape ký tự phân cách: mật khẩu có `!` hay topic có `.` là hỏng với các driver tách chuỗi bằng ký tự đó.

## Kiểu dữ liệu và quyền ghi

- `Type` chung của ATFile: `Bool`, `Byte`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String`, `Default`. **Mỗi driver chỉ nhận một phần và có thể hiểu khác nhau** (`Long` là 32 bit ở S7/Mitsubishi nhưng 64 bit ở Omron; vài driver có kiểu riêng như `DLong`, `SinglePoint`). Luôn theo bảng kiểu trong file driver.
- Tránh `Type="Default"`: ở S7, Mitsubishi, Omron, IEC 104 nó chỉ là tiện ích của giao diện thiết kế, khi chạy tag sẽ Bad. Ghi kiểu cụ thể. Ngoại lệ là OPC DA.
- Kiểu 32/64 bit chiếm nhiều thanh ghi: Float, DWord, Long (32 bit) 2 thanh ghi, Double 4. Địa chỉ các tag liên tiếp phải cách nhau đúng số đó.
- Thứ tự word của kiểu 32/64 bit phải khớp thiết bị (trường `OrderBy` hoặc `ByteOrder` của device). Không biết thì hỏi, hoặc đề nghị người dùng thử trên một tag đã biết giá trị.
- `ClientAccess`: `ReadOnly` hoặc `ReadWrite`. Vùng nhớ chỉ đọc của thiết bị (input register, discrete input...) đặt `ReadOnly`. Đa số driver không tự chặn ghi theo `ClientAccess`, nên khai báo đúng là để phía trên không ghi nhầm.
- Driver không scale. Hệ số nhân (thanh ghi x0,1) đặt ở `Scale`/`Offset` của TagFile.

## Tổ chức kênh và thiết bị

- Một Channel = một đường truyền + một driver: một cổng COM, một broker MQTT, một loại giao thức. Nhiều thiết bị cùng đường truyền thì nhiều `<Device>` trong cùng Channel.
- Các Channel được quét song song. Hệ lớn nên tách kênh theo cụm (mỗi nhà máy, mỗi tủ một kênh) để kênh này chậm không kéo kênh kia.
- **Tên Device phải duy nhất trong cả file**, không chỉ trong kênh: bước 2 lấy tên Device làm tên Task, và mọi nơi phía sau gọi tag là `Task.Tag`.
- Khối đọc gộp (block) khai báo khi thiết bị bắt đọc nguyên khối hoặc cần đọc nhanh; tag phải nằm trọn trong khối. Cú pháp khối khác nhau theo driver.
- Một số driver có tag hệ thống (ví dụ DR404 MQTT có `#Status`, `#LastUpdate`). Nên thêm cho mỗi device để web hiện được trạng thái kết nối.
- Mật khẩu broker, API key, community string nằm dạng chữ thường trong ATFile. Lấy từ người dùng và nhắc họ điều này.

## Tag nội bộ (Internal Memory)

Hầu như project nào cũng cần một kênh `InternalMemory.dll` cho những giá trị không nằm trên thiết bị:

- ngưỡng alarm cao/thấp của từng đại lượng (để sửa được từ web),
- cài đặt (chu kỳ log, email nhận alarm, bật/tắt mô phỏng),
- đích của liên kết chuyển trang trên sơ đồ SVG (một tag cho mỗi trang đích),
- giá trị do desktop app tính ra (tổng nhiều đồng hồ, điện năng theo ngày, điểm số...).

Quy ước: `ChannelAddress` = `InternalMemory|60000` (số sau là chu kỳ lưu ra file, ms), `DeviceID` = tên device, `Addrress` = tên tag, `Type` = `String`, `ClientAccess` = `ReadWrite`. Chi tiết và các bẫy (tag mới đọc ra chuỗi trắng, ghi vào tag chưa được đọc bị bỏ qua) ở `references/drivers/internal-memory.md`.

Hệ chưa có thiết bị thật (demo, mô phỏng) có thể khai báo toàn bộ bằng Internal Memory rồi cho desktop app ghi số liệu vào; khi có thiết bị chỉ đổi kênh, tên `Task.Tag` giữ nguyên nên web và logger không phải sửa.

## Khai báo trong `tools/model.js`

```js
const CHANNELS = [
  { name: 'MB_TCP', dll: 'ModbusTCP.dll', address: '3600',             // rate, maxWrite tuỳ chọn (1000, 10)
    devices: [
      { name: 'Meter1', id: '192.168.1.11|502|1|1000|1|10|', desc: 'Incomer 1',   // task: tên Task nếu khác tên device
        tags: [
          { name: 'Power_P', addr: '400013', type: 'Float', access: 'ReadOnly', desc: 'Active power (kW)' },
          { name: 'U1', alias: 'Voltage_L1', addr: '400001', type: 'Word', access: 'ReadOnly', scale: 0.1, desc: 'Voltage L1 (V)' },
        ] },
    ] },
  { name: 'IM_SYS', dll: 'InternalMemory.dll', address: 'InternalMemory|60000',
    devices: [{ name: 'Setting', tags: [['Timerate', 'Logging interval (ms)'], ['Email_Alarm', 'Alarm e-mail recipients']] }] },
];
```

- Tag dạng đối tượng cho thiết bị thật; dạng `[tên, mô tả]` là tag nội bộ (`addr` = tên, `String`, `ReadWrite`).
- `dll` chỉ ghi tên file; đường dẫn ghép từ `PROJECT.driverDir` (mặc định là thư mục cài chuẩn).
- `alias` là tên phía client (TagName trong TagFile) khi muốn đặt lại cho dễ hiểu; `scale`/`offset` cũng đi vào TagFile.
- Nhiều thiết bị cùng loại: khai báo danh sách tag một lần rồi `map` ra các device, như file mẫu.

`node tools/gen.js` ghi `ATFile_<Ten>.xml` và báo số channel/device/tag. Nó kiểm tra tên, trùng lặp, kiểu, quyền ghi; **nó không kiểm tra được chuỗi địa chỉ của driver**, phần đó phải tự đối chiếu với file driver.

## Kiểm tra trước khi giao

- Parse được bằng trình đọc XML.
- Đếm số trường của `ChannelAddress` và `DeviceID` so với file driver; ký tự phân cách cuối còn đủ.
- Không trùng tên tag trong một device, không trùng tên device trong cả file, không trùng địa chỉ ngoài ý muốn.
- Kiểu dữ liệu hợp với vùng nhớ; tag liên tiếp không chồng thanh ghi; tag nằm trọn trong khối đọc gộp nếu có khối.
- DLL trong `ChannelDriverLocation` có trong danh sách driver đã cài (nếu máy có cài).
- Báo cho người dùng: số channel/device/tag và những giá trị đang dùng mặc định (timeout, chu kỳ quét, thứ tự word).

## Tag Bad thì xem gì

Theo thứ tự hay gặp:

1. Sai số trường hoặc thiếu ký tự phân cách cuối trong `DeviceID`/`ChannelAddress` (cả device Bad, không có thông báo).
2. Địa chỉ viết sai dạng (Modbus `40001` bị hiểu là Coil 40001; phải viết đủ 6 số `400001`).
3. Kiểu không hợp vùng nhớ (Bool trên thanh ghi không có `.bit`, `Default` ở driver không nhận).
4. Khối đọc gộp đọc lỗi thì mọi tag trong khối Bad; thử bỏ khối để đọc từng tag.
5. Đường truyền: IP/port/COM, thiết bị khác đang giữ cổng, unit ID.
6. Giá trị 32 bit sai (không Bad): đổi thứ tự word.

Mục "Lưu ý / lỗi hay gặp" trong file của từng driver có danh sách riêng.
