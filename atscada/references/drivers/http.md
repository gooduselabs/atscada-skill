# HTTP / REST - `HTTPClient.dll`

Nguồn xác nhận: README + source (`HttpAddressing.cs`, `HTTPDriver.cs`, `HttpRestClient.cs`, `JsonPath.cs`). DLL có trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\`.

## 1. Driver dùng cho gì
- Đọc giá trị từ REST API bằng `GET` (phản hồi JSON hoặc văn bản thuần), ghi bằng `POST` / `PUT` / `PATCH`. Hỗ trợ `http://` và `https://`.
- DLL: `HTTPClient.dll` (không cần DLL phụ).

## 2. ChannelAddress
Định dạng: `Timeout!CacheMs!IgnoreCert` - **3 trường, phân cách `!`**. Mặc định: `2500!500!0`.

| # | Trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| 1 | Timeout (ms) | `2500` | > 0 (UI >= 100). Timeout mỗi request. Nên < 3000 ms (read timeout của ATDriver Server). |
| 2 | CacheMs | `500` | >= 0. Các tag đọc cùng URL trong khoảng này dùng chung 1 request. |
| 3 | IgnoreCert | `0` | `1` = chấp nhận chứng chỉ HTTPS tự ký; mọi giá trị khác = không. |

Parser khoan dung: trường thiếu/sai lấy mặc định. Ví dụ: `2500!500!0`, `2000!1000!1`.

## 3. DeviceID
Định dạng: `BaseUrl|AuthType|User|Secret|Headers` - **phân cách `|`**, 5 trường theo thứ tự. Chỉ BaseUrl bắt buộc; các trường sau có thể bỏ (UI luôn ghi đủ 5 trường, nên ghi đủ: `http://host/api|None|||`).

| # | Trường | Ý nghĩa |
|---|---|---|
| 1 | BaseUrl | Bắt buộc, URL tuyệt đối bắt đầu `http://` hoặc `https://`. Dấu `/` cuối bị cắt. |
| 2 | AuthType | `None` (mặc định khi rỗng), `Basic`, `Bearer`, `ApiKey` (không phân biệt hoa thường). Giá trị lạ -> device lỗi. |
| 3 | User | Basic: tên đăng nhập. ApiKey: **tên header** (vd `X-API-Key`) - bắt buộc khi ApiKey. |
| 4 | Secret | Basic: mật khẩu. Bearer: token. ApiKey: giá trị key. |
| 5 | Headers | Header bổ sung: `Name: value;Name2: value2` (phân cách `;`, tên và giá trị cách nhau bằng `:` đầu tiên). |

- **Không trường nào được chứa `|`**; giá trị header không được chứa `;`.
- Ví dụ:
  - `http://192.168.1.10:8080/api|None|||`
  - `http://192.168.1.10/api|Basic|user|pass|`
  - `https://api.example.com/v1|Bearer||TOKEN_HERE|Accept: application/json`
  - `http://192.168.1.10/api|ApiKey|X-API-Key|KEY_HERE|`

## 4. Tag address
Định dạng: `ReadPath|JsonPath|WriteMethod|WritePath|BodyTemplate` - **phân cách `|`**, tách tối đa 5 phần (nên chỉ BodyTemplate được chứa `|`). Các phần cuối có thể bỏ; UI luôn ghi đủ 5 phần (tag chỉ đọc: `/status|data.value|||`).

| # | Phần | Ý nghĩa |
|---|---|---|
| 1 | ReadPath | Đường dẫn tương đối so với BaseUrl (được kèm query `?a=1`), đọc bằng GET. Rỗng = chính BaseUrl. Bắt đầu `http://`/`https://` = dùng nguyên URL đó. Thiếu `/` đầu sẽ được tự thêm. |
| 2 | JsonPath | Vị trí giá trị trong JSON. Rỗng = toàn bộ body (API trả văn bản thuần). |
| 3 | WriteMethod | Rỗng = chỉ đọc; `POST`, `PUT`, `PATCH`. Giá trị khác -> tag Bad. |
| 4 | WritePath | Rỗng = dùng ReadPath. |
| 5 | BodyTemplate | Body gửi khi ghi. `{json}` = giá trị mã hóa JSON theo Type (String có nháy, Bool `true/false`, số); `{value}` = văn bản thô. Rỗng = `{json}`. |

Cú pháp JsonPath (bộ parse tự viết, không phải JSONPath đầy đủ):
- `$` đầu tùy chọn; khóa nối bằng `.`: `data.temp`, `$.data.temp`
- chỉ số mảng: `items[0].value`, `[0].name`
- khóa có dấu chấm/ký tự lạ: `$['key.with.dots'].v`
- bộ lọc phần tử mảng đầu tiên có field bằng giá trị (so sánh không phân biệt hoa thường): `sensors[id=T1].value`, `devices[info.serial='A 01'].power`
- số phần tử mảng: `alarms.length`

Ví dụ địa chỉ: `/status|data.temp|||` (chỉ đọc); `/api/room/1|data.setpoint|PUT|/api/room/1/setpoint|{"value":{json}}`; `/temp.txt||||` (văn bản thuần).

Không có truy cập bit.

## 5. Kiểu dữ liệu
`Bool`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String`. Không có register/byte; Type chỉ quyết định cách ép giá trị đọc được:
- `String` (hoặc Type rỗng): trả nguyên văn bản (object/mảng JSON trả dạng chuỗi JSON).
- Kiểu số: chấp nhận `true/on/yes` = 1, `false/off/no` = 0, số dấu chấm, số dấu phẩy thập phân (`19,8`), số kèm đơn vị (`23.5 °C`, `85.2kW`). `1,234` (đúng 3 chữ số sau dấu phẩy) bị coi là mơ hồ -> Bad. Ngày/giờ -> Bad.
- Word/Short/DWord/Long: làm tròn rồi kiểm tra phạm vi, ngoài phạm vi -> Bad. Bool: khác 0 -> `1`.
- Không có scaling.

## 6. ReadOnly / ReadWrite
- Khả năng ghi do **WriteMethod trong địa chỉ tag** quyết định: WriteMethod rỗng -> mọi lệnh ghi trả `Bad` dù ClientAccess là ReadWrite. Driver không kiểm tra ClientAccess.
- Quy tắc: tag chỉ đọc -> `ClientAccess="ReadOnly"` và để trống phần 3-5; tag ghi -> `ReadWrite` + WriteMethod (+ WritePath, BodyTemplate).
- Ghi thành công khi server trả mã 2xx; sau đó cache bị xóa để lần đọc kế thấy giá trị mới.

## 7. Tag hệ thống / đặc biệt
Không có.

## 8. Block read
Không có block theo địa chỉ; thay vào đó là **cache theo URL**: mọi tag có cùng DeviceID + URL đọc trong `CacheMs` chỉ tốn 1 request. Nên gom nhiều tag vào cùng một endpoint trả JSON và đặt `CacheMs` gần bằng ChannelRate.

## 9. Lưu ý / lỗi hay gặp
- **Thoát ký tự XML trong ATFile**: BodyTemplate thường chứa `"` -> trong thuộc tính XML phải viết `&quot;`; `&` trong query -> `&amp;`; `<` -> `&lt;`. (Lưu từ giao diện ATDriver Server thì tự thoát.)
- Import tag bằng CSV của ATDriver Server tách theo dấu `,` -> địa chỉ/BodyTemplate có dấu phẩy không import được bằng CSV.
- Đọc chỉ chấp nhận mã 2xx; 4xx/5xx -> Bad. Không kết nối được (timeout, DNS, TLS) -> device bị giữ offline 10 giây (đọc Bad ngay), lệnh ghi vẫn được gửi.
- JsonPath trỏ tới khóa không tồn tại hoặc giá trị `null` -> Bad.
- Secret/token lưu dạng văn bản thuần trong DeviceID (nằm trong ATFile).
- Channel luôn "Connect" thành công; lỗi chỉ thấy ở trạng thái từng tag. Không có retry trong driver.

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="HTTP1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\HTTPClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="2500!500!0" />
    <Device>
      <DeviceName Value="RoomApi" />
      <DeviceID Value="http://192.168.1.10:8080/api|Basic|user|pass|Accept: application/json" />
      <Tag Name="Temp" Addrress="/room/1|data.temp|||" Type="Float" ClientAccess="ReadOnly" Description="Room temperature" />
      <Tag Name="Running" Addrress="/room/1|data.running|||" Type="Bool" ClientAccess="ReadOnly" Description="Running state" />
      <Tag Name="Setpoint" Addrress="/room/1|data.setpoint|PUT|/room/1/setpoint|{&quot;value&quot;:{json}}" Type="Float" ClientAccess="ReadWrite" Description="Setpoint" />
      <Tag Name="AlarmCount" Addrress="/alarms|alarms.length|||" Type="Word" ClientAccess="ReadOnly" Description="Number of alarms" />
    </Device>
  </Channel>
</Root>
```
