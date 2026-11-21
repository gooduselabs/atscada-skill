# Vision Counter (REST API) - `VisionCounterClient.dll`

Nguồn xác nhận: README + source (`VcAddressing.cs`, `VisionCounterDriver.cs`, `VcApiClient.cs`). Tên DLL lấy từ csproj (`AssemblyName` = `VisionCounterClient`); **DLL này KHÔNG có sẵn trong thư mục cài đặt** `C:\Program Files\ATPro\ATDriverServer\Drivers\` của máy khảo sát - phải build và copy vào trước khi dùng.

## 1. Driver dùng cho gì
- Kết nối ứng dụng **ATSCADA Vision Counter** (đếm sản phẩm bằng camera) qua REST API `http://Host:Port/api/v1`, xác thực bằng header `X-API-Key`.
- Đọc số đếm / trạng thái camera; gửi lệnh Start / Pause / Reset đếm. Chỉ `http://` (không HTTPS).
- DLL: `VisionCounterClient.dll` (không cần DLL phụ).

## 2. ChannelAddress
Định dạng: `Timeout!LiveCacheMs!TotalsCacheMs` - **3 trường, phân cách `!`**. Mặc định: `2500!1000!5000` (ChannelAddress rỗng cũng lấy mặc định này).

| # | Trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| 1 | Timeout (ms) | `2500` | > 0 (UI >= 100). Timeout mỗi request. |
| 2 | LiveCacheMs | `1000` | >= 0. `/api/v1/live` được gọi tối đa 1 lần mỗi chu kỳ này (API khuyến nghị không quá 1 lần/giây). |
| 3 | TotalsCacheMs | `5000` | >= 0. Như trên cho `/api/v1/totals` (truy vấn nặng hơn). |

Parser khoan dung: trường thiếu/sai lấy mặc định.

## 3. DeviceID
Định dạng: `Host:Port|ApiKey` - phân cách `|` giữa endpoint và key (tách tối đa 2 phần), `:` giữa Host và Port.

| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| Host | (bắt buộc) | IP hoặc tên máy chạy Vision Counter. Không chứa `/`, khoảng trắng, `?`, `#`. Không ghi `http://`. |
| Port | `8090` nếu bỏ `:Port` | 1..65535 |
| ApiKey | (rỗng) | Key lấy ở Vision Counter: Settings > Data export > API for client systems. Giao diện bắt buộc nhập. Key chỉ đọc -> lệnh Command bị từ chối (403). |

Ví dụ: `192.168.1.10:8090|API_KEY_HERE`.

## 4. Tag address
Định dạng: `Source|Camera|Zone|Class|Field` - **đúng 5 phần, phân cách `|`** (khác 5 phần -> tag Bad). Phần Camera/Zone/Class rỗng được coi là `*`.

| # | Phần | Giá trị |
|---|---|---|
| 1 | Source | `Live` (bộ đếm đang hiển thị, về 0 khi reset), `Today` (đếm đã lưu từ 00:00 hôm nay theo giờ PC chạy driver), `Command` (chỉ ghi). Không phân biệt hoa thường. |
| 2 | Camera | camera_id (số nguyên >= 0, chỉ chữ số) hoặc `*` = cộng tất cả camera |
| 3 | Zone | tên vùng đếm (đúng như trong Vision Counter, có thể có dấu/khoảng trắng) hoặc `*` |
| 4 | Class | tên lớp đối tượng hoặc `*` (so sánh không phân biệt hoa thường) |
| 5 | Field | theo Source - xem bảng dưới (không phân biệt hoa thường) |

| Source | Field hợp lệ | Giá trị |
|---|---|---|
| Live | `Total` | số đếm (lọc được theo Camera/Zone/Class) |
| Live | `Pass`, `Fail` | số đạt / lỗi - chỉ cộng theo Camera (Zone/Class bị bỏ qua) |
| Live | `Counting` | 1/0 - **bắt buộc chỉ định 1 camera** (không dùng `*`) |
| Live | `Running` | 1 nếu state = "running" - bắt buộc 1 camera |
| Live | `State`, `Mode` | chuỗi - bắt buộc 1 camera |
| Today | `Total` | số đếm đã lưu trong ngày (lọc theo Camera/Zone/Class) |
| Command | `Start`, `Pause`, `Reset` | lệnh; đọc luôn ra `0` |

Ví dụ: `Live|1|*|*|Total`, `Live|1|Vùng 1|*|Total`, `Today|*|*|thùng|Total`, `Live|1|*|*|Running`, `Live|1|*|*|State`, `Command|1|*|*|Reset`, `Command|*|*|*|Start` (mọi camera).

Không có truy cập bit.

## 5. Kiểu dữ liệu
`Bool`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String`. Không có register/byte. Số nguyên được làm tròn và kiểm tra phạm vi (ngoài phạm vi -> Bad); Bool = khác 0.
- `Total` / `Pass` / `Fail`: dùng `DWord` (hoặc `Long`).
- `Counting` / `Running` và các tag `Command`: dùng `Bool`.
- `State` / `Mode`: **phải là `String`** (kiểu số sẽ Bad).

## 6. ReadOnly / ReadWrite
- Chỉ tag `Command` ghi được; ghi vào tag `Live`/`Today` luôn trả `Bad`. Driver không kiểm tra ClientAccess.
- Quy tắc: `Live`/`Today` -> `ReadOnly`; `Command` -> `ReadWrite`.
- Ghi giá trị khác 0 (`1`, `true`, `on`) -> gửi lệnh POST. Ghi `0` -> không làm gì và trả Good (nút nhấn ghi 1 rồi 0 vẫn đúng).

## 7. Tag hệ thống / đặc biệt
Các tag `Command|<camera hoặc *>|*|*|Start|Pause|Reset` là tag lệnh (xem trên). Không có tag trạng thái kết nối riêng; có thể dùng `Live|<id>|*|*|State`.

## 8. Block read
Không có block theo địa chỉ. Mọi tag của một device dùng chung 1 request `/live` mỗi `LiveCacheMs` và 1 request `/totals` mỗi `TotalsCacheMs`.

## 9. Lưu ý / lỗi hay gặp
- Địa chỉ không đủ 5 phần (vd `Live|1|Total`) -> Bad. Luôn ghi đủ `*` cho phần không lọc.
- `Counting/Running/State/Mode` với Camera = `*` -> địa chỉ không hợp lệ.
- Zone/Class chưa có đếm -> cộng 0 (không lỗi); camera không có trong `/live` khi chọn 1 camera -> Bad; camera không có trong `/totals` -> 0.
- Sai API key (401) -> tag Bad nhưng device vẫn coi là online; không kết nối được -> giữ offline 10 giây.
- `Today` dùng giờ của PC chạy driver; lệch giờ với máy Vision Counter sẽ sai mốc 00:00.
- Tên Zone/Class có ký tự `&`, `<`, `"` phải thoát XML trong ATFile (`&amp;`, `&lt;`, `&quot;`); không được chứa `|`. File ATFile nên lưu UTF-8 (tên tiếng Việt có dấu).
- ApiKey lưu dạng văn bản thuần trong DeviceID.

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="Vision1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\VisionCounterClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="2500!1000!5000" />
    <Device>
      <DeviceName Value="Counter1" />
      <DeviceID Value="192.168.1.10:8090|API_KEY_HERE" />
      <Tag Name="Cam1_Total" Addrress="Live|1|*|*|Total" Type="DWord" ClientAccess="ReadOnly" Description="Live count camera 1" />
      <Tag Name="Cam1_Today" Addrress="Today|1|*|*|Total" Type="DWord" ClientAccess="ReadOnly" Description="Stored count today camera 1" />
      <Tag Name="Cam1_Running" Addrress="Live|1|*|*|Running" Type="Bool" ClientAccess="ReadOnly" Description="Camera 1 running" />
      <Tag Name="Cam1_State" Addrress="Live|1|*|*|State" Type="String" ClientAccess="ReadOnly" Description="Camera 1 state text" />
      <Tag Name="Cam1_Reset" Addrress="Command|1|*|*|Reset" Type="Bool" ClientAccess="ReadWrite" Description="Reset counter camera 1" />
    </Device>
  </Channel>
</Root>
```
