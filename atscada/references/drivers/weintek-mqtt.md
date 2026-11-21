# WEINTEK MQTT - `WEINTEKMQTTClient.dll`

## 1. Driver dùng cho gì

- Đọc/ghi HMI/gateway **Weintek** qua MQTT (3.1.1, có tùy chọn TLS). Payload JSON theo định dạng Weintek: `{"d": {"TênBiến": [giá trị]}, "ts": "..."}`.
- Một Device = một topic subscribe (một gói JSON chứa nhiều biến). Một Tag = một khóa trong `d`, kèm topic publish riêng để ghi.
- DLL: `WEINTEKMQTTClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`). Cần `Newtonsoft.Json.dll` cùng thư mục (đã có sẵn trong bản cài).

## 2. ChannelAddress

Đúng **8 trường**, phân cách bằng `!`. Khác 8 trường -> không kết nối, không báo lỗi.

```
Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)!EnableTLS
```

| # | Trường | Mặc định UI | Ý nghĩa |
|---|---|---|---|
| 1 | Server | `broker.mqttdashboard.com` | Host broker |
| 2 | Port | `1883` | `8883` khi bật TLS; parse lỗi -> 1883 |
| 3 | User | `admin` | UI bắt buộc khác rỗng; driver luôn gửi credential |
| 4 | Password | (mẫu) | UI bắt buộc khác rỗng |
| 5 | KeepAlive | `5000` | **ms**; parse lỗi -> 5000 |
| 6 | CleanSession | `True` | `True`/`False`; parse lỗi -> True |
| 7 | TimeOut | `120000` | ms; dữ liệu cũ hơn (theo giờ máy lúc nhận) -> tag Bad |
| 8 | EnableTLS | `False` | `True`/`False`; parse lỗi -> False |

Ví dụ: `broker.example.com!1883!user!pass!5000!True!120000!False`

TLS (`EnableTLS` = `True`, TLS 1.2): driver đọc cố định thư mục `C:\Program Files\ATPro\ATDriverServer\MQTTCertificates\` và cần đủ 3 file `ca.pem`, `client.pfx`, `clientKeyPass.txt` (mật khẩu của file pfx). **Thiếu một file -> không kết nối**, không báo lỗi.

## 3. DeviceID

Đúng **3 trường**, phân cách bằng `.`. Khác 3 trường -> mọi tag Bad.

```
SubTopic.QoS.Retain
```

| # | Trường | Mặc định UI | Ý nghĩa |
|---|---|---|---|
| 1 | SubTopic | `NewTopic` | Topic Weintek publish dữ liệu; so khớp **chính xác**, không wildcard `+`/`#` |
| 2 | QoS | `0` | 0/1/2 - QoS subscribe |
| 3 | Retain | `True` | `True`/`False`. **Không được driver dùng**, nhưng bắt buộc có để đủ 3 trường |

Ví dụ: `WEINTEK/DEMO/PUB/Topic1.0.True`

- SubTopic **không được chứa `.`**.
- Các device cùng SubTopic dùng chung một bộ đệm.

## 4. Tag address

**3 phần** phân cách bằng `.`:

```
AddressName.PubTopic.QoS
```

| Phần | Ý nghĩa |
|---|---|
| AddressName | Tên biến = khóa trong object `d` của JSON (phân biệt hoa thường) |
| PubTopic | Topic publish khi **ghi** tag này |
| QoS | 0/1/2 - QoS publish khi ghi |

Ví dụ: `Test1.WEINTEK/DEMO/SUB/Topic1/Test1.2`

- Khi đọc driver chỉ dùng phần đầu (AddressName); khi ghi cần đủ 3 phần. Luôn khai đủ 3 phần (UI cũng luôn sinh đủ 3), kể cả tag ReadOnly.
- AddressName và PubTopic **không được chứa `.`**.

Payload nhận:

```json
{ "d": { "Test1": [123], "Run": [true], "Name": ["abc"] }, "ts": "2024-01-01T10:00:00.000000" }
```

- Mỗi biến là **mảng**; driver chỉ lấy phần tử đầu `[0]`.
- Bộ đệm hợp nhất theo từng biến: bản tin chỉ chứa một số biến vẫn dùng được.

## 5. Kiểu dữ liệu

Không có thanh ghi; Type quyết định cách parse giá trị.

| Type | Khi đọc | Khi ghi |
|---|---|---|
| Bool | JSON phải là `true`/`false` -> trả 1/0. Giá trị `0`/`1` trong JSON -> **Bad** | Giá trị ghi phải là số nguyên (`0`/`1`) -> gửi `[false]`/`[true]` |
| Word | ushort | `[số]` |
| Short | short | `[số]` |
| DWord | uint | Gửi dạng double |
| Long | **int 32 bit** | Gửi dạng double |
| Float / Double | float / double | `[số]` |
| String | Trả nguyên chuỗi | `["chuỗi"]` (dấu cách trong chuỗi bị xóa) |

Parse lỗi -> Bad. Không có scale/offset/byte order.

## 6. ReadOnly / ReadWrite

- UI luôn tạo tag `ReadWrite`; driver không chặn ghi. Biến chỉ đọc nên khai `ClientAccess="ReadOnly"`.
- Ghi: publish lên PubTopic của tag, QoS của tag, **luôn retain = true**:
  `{"d":{"Test1":[123]},"ts":"2024-01-01T02:00:00.000000"}`
- Trả `Good` ngay khi đưa lệnh publish đi, không chờ Weintek xác nhận. Giá trị đọc chỉ đổi khi Weintek publish lại trên SubTopic.
- Chưa kết nối broker -> lệnh ghi không được gửi.
- Vì retain luôn bật, broker giữ lệnh ghi cuối và phát lại cho Weintek mỗi khi nó subscribe lại.

## 7. Tag hệ thống

Không có (trường `ts` của bản tin không đọc được qua tag).

## 8. Block read

Không có. Một SubTopic = một lần subscribe cho mọi tag của device.

## 9. Lưu ý / lỗi hay gặp

- Sai số trường: Channel khác 8, Device khác 3 -> im lặng, mọi tag Bad. Quên trường `EnableTLS` cuối là lỗi hay gặp (chuỗi 7 trường của driver KingPigeon/DR404 không dùng được ở đây).
- Tag Bool Bad: Weintek gửi `[1]`/`[0]` thay vì `[true]`/`[false]` -> đổi Type sang Word.
- TimeOut tính theo **từng biến**: biến không xuất hiện trong bản tin quá TimeOut thì Bad. Đặt TimeOut lớn hơn chu kỳ publish của Weintek.
- Lần đọc đầu tiên của mỗi SubTopic luôn Bad (chỉ khởi tạo và subscribe).
- Ký tự `!` trong mật khẩu/host làm lệch ChannelAddress; `.` trong topic/tên biến làm lệch DeviceID và tag address.
- Trong XML phải escape `&` `<` `"` trong mật khẩu.
- Ghi Bool bằng `true`/`false` (chữ) không hợp lệ - phải ghi `0`/`1`.
- Số thập phân parse theo culture của Windows.
- Mật khẩu lưu dạng văn bản thường.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MQTT_Weintek" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\WEINTEKMQTTClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="broker.example.com!1883!user!pass!5000!True!120000!False" />
    <Device>
      <DeviceName Value="HMI1" />
      <DeviceID Value="weintek/hmi1/pub.0.True" />
      <Tag Name="Speed" Addrress="Speed.weintek/hmi1/sub/Speed.1" Type="Word" ClientAccess="ReadWrite" Description="Key Speed in d" />
      <Tag Name="Temperature" Addrress="Temp.weintek/hmi1/sub/Temp.1" Type="Float" ClientAccess="ReadOnly" Description="Key Temp in d" />
      <Tag Name="Run" Addrress="Run.weintek/hmi1/sub/Run.1" Type="Bool" ClientAccess="ReadWrite" Description="Key Run in d, JSON true/false" />
    </Device>
  </Channel>
</Root>
```
