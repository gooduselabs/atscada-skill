# KingPigeon MQTT - `KPMQTTClient.dll`

## 1. Driver dùng cho gì

- Đọc/ghi gateway/cảm biến **KingPigeon (BeiLai Gateway)** qua MQTT. Payload là JSON KingPigeon: một object có mảng `sensorDatas`, mỗi phần tử là một điểm đo nhận diện bằng `flag`.
- Một Device = một topic subscribe (+ một topic publish để ghi). Một Tag = một `flag`.
- DLL: `KPMQTTClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`). Cần `Newtonsoft.Json.dll` cùng thư mục (đã có sẵn trong bản cài).

## 2. ChannelAddress

Đúng **7 trường**, phân cách bằng `!`. Khác 7 trường -> không kết nối, không báo lỗi.

```
Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)
```

| # | Trường | Mặc định UI | Ý nghĩa |
|---|---|---|---|
| 1 | Server | `broker.mqttdashboard.com` | Host broker |
| 2 | Port | `1883` | Parse lỗi -> 1883 |
| 3 | User | `admin` | UI bắt buộc khác rỗng; driver luôn gửi credential |
| 4 | Password | (mẫu) | UI bắt buộc khác rỗng |
| 5 | KeepAlive | `5000` | **ms**; parse lỗi -> 5000 |
| 6 | CleanSession | `True` | `True`/`False`; parse lỗi -> True |
| 7 | TimeOut | `120000` | ms; dữ liệu cũ hơn -> tag Bad; parse lỗi -> 120000 |

Ví dụ: `broker.example.com!1883!user!pass!5000!True!120000`

- Không có TLS. ClientId là GUID tự sinh. Auto-reconnect 5 s.

## 3. DeviceID

Đúng **6 trường**, phân cách bằng `.`. Khác 6 trường -> mọi tag Bad.

```
GatewayID.UseGatewayID.SubscribeTopic.QoS.PublishTopic.Retain
```

| # | Trường | Mặc định UI | Ý nghĩa |
|---|---|---|---|
| 1 | GatewayID | `BeiLai Gateway` | Phải trùng trường `gateway_indentify` trong JSON (giữ nguyên lỗi chính tả `indentify`). Cho phép dấu cách |
| 2 | UseGatewayID | (ô check) | `True` hoặc `False` - xem quy tắc khớp bên dưới |
| 3 | SubscribeTopic | `NewTopic` | Topic gateway publish dữ liệu; so khớp **chính xác**, không wildcard |
| 4 | QoS | `0` | 0/1/2, dùng cho cả subscribe và publish |
| 5 | PublishTopic | `NewTopic` | Topic gửi lệnh ghi (cũng được ghi vào trường `down` của payload) |
| 6 | Retain | `True` | `True`/`False` - cờ retain khi ghi |

Ví dụ: `BeiLai Gateway.True.kp/up.0.kp/down.False`

Quy tắc khớp message (theo source):

| Message nhận | UseGatewayID = `True` | UseGatewayID = `False` |
|---|---|---|
| Có `gateway_indentify` trùng GatewayID | Nhận | **Không nhận** |
| Có `gateway_indentify` khác | Không nhận | **Không nhận** |
| Không có `gateway_indentify` | Không nhận | Nhận |

=> Gateway có gửi `gateway_indentify` (trường hợp thông thường) thì **bắt buộc** `True` và GatewayID đúng từng ký tự. `False` chỉ dùng khi payload không có trường này.

- Không trường nào được chứa `.` (GatewayID, topic).
- **QoS**: driver khớp theo QoS **thực nhận** của message (= min(QoS gateway publish, QoS subscribe)). Nếu khai QoS 1/2 mà gateway publish QoS 0 thì dữ liệu không bao giờ cập nhật. Đặt `0` là an toàn nhất; chỉ dùng 1/2 khi chắc gateway publish ở QoS đó trở lên.

## 4. Tag address

Tag address = **`flag`** của điểm đo (phân biệt hoa thường, khớp chính xác). Ví dụ `Temp1`, `REG40001`, `DO1`.

Payload nhận:

```json
{
  "gateway_indentify": "BeiLai Gateway",
  "time": "2024-01-01 10:00:00",
  "addTime": "1704103200000",
  "sensorDatas": [
    { "flag": "Temp1", "value": "25.6" },
    { "flag": "DO1", "switcher": 1 },
    { "flag": "GPS1", "lng": "105.8", "lat": "21.0" }
  ]
}
```

Thứ tự tra cứu khi đọc:

1. `#Time`, `#UTC` (mục 7).
2. Tên trùng một **trường lạ cấp gói** (khóa JSON ngoài `gateway_indentify`, `time`, `addTime`, `down`, `sensorDatas`) -> trả giá trị dạng chuỗi.
3. `flag` trong `sensorDatas`:
   - có `switcher` -> điểm số (digital): Type **phải là `Bool`**, trả 0/1;
   - có `value` -> điểm analog: Type Word/Short/DWord/Long/Float/Double/String; **Bool -> Bad**;
   - có `lng` và `lat` -> trả chuỗi `lng;lat` (dùng Type `String`).

- Flag không nên chứa `.`: khi ghi, driver chỉ lấy phần trước dấu `.` đầu tiên làm flag.

## 5. Kiểu dữ liệu

Không có thanh ghi; Type quyết định cách parse chuỗi `value`.

| Type | Nguồn | Ghi chú |
|---|---|---|
| Bool | `switcher` | Chỉ cho điểm có `switcher` |
| Word | `value` | ushort |
| Short | `value` | short |
| DWord | `value` | uint |
| Long | `value` | **int 32 bit** |
| Float / Double | `value` | Parse theo culture của Windows |
| String | `value` / trường gói / GPS | Trả nguyên chuỗi |

Parse lỗi (ví dụ `value` = `25.6` với Type Word) -> Bad. Không có scale/offset.

## 6. ReadOnly / ReadWrite

- UI luôn tạo tag `ReadWrite`; driver không chặn ghi. Điểm chỉ đọc (AI/DI) nên khai `ClientAccess="ReadOnly"`.
- Ghi: publish lên PublishTopic với QoS/Retain của device. Type `Bool` -> gửi `switcher` (giá trị ghi phải là số `0`/`1`); Type khác -> gửi `value` dạng chuỗi.
- Payload ghi (đã bị xóa mọi dấu cách):
  `{"sensorDatas":[{"flag":"DO1","value":"","switcher":1,"lng":"","lat":""}],"down":"<PublishTopic>","time":"","addTime":""}`
- Trả `Good` ngay khi đưa lệnh publish đi, **không chờ** gateway xác nhận. Giá trị đọc chỉ đổi khi gateway publish lại trạng thái.
- Dấu cách trong giá trị String bị xóa khi ghi.

## 7. Tag hệ thống

| Address | Type nên dùng | Ý nghĩa |
|---|---|---|
| `#Time` | String | Trường `time` của bản tin mới nhất |
| `#UTC` | String | Trường `addTime` của bản tin mới nhất |

Không có tag trạng thái kết nối. Hai tag này chuyển Bad khi quá TimeOut không có bản tin -> dùng làm dấu hiệu mất liên lạc.

## 8. Block read

Không có. Driver giữ bản mới nhất của từng `flag`; bản tin chỉ chứa một phần các flag vẫn được hợp nhất.

## 9. Lưu ý / lỗi hay gặp

- Mọi tag Bad dù broker có dữ liệu: kiểm tra theo thứ tự (a) GatewayID khác `gateway_indentify`, (b) UseGatewayID = `False` trong khi payload có `gateway_indentify`, (c) QoS khai lớn hơn QoS gateway publish, (d) topic subscribe không trùng chính xác / dùng wildcard.
- TimeOut tính theo **từng flag**: flag nào không xuất hiện trong bản tin quá TimeOut thì riêng tag đó Bad. Đặt TimeOut lớn hơn chu kỳ gửi của gateway.
- Lần đọc đầu tiên của mỗi device luôn Bad (chỉ khởi tạo và subscribe).
- Điểm analog mà khai Bool, hoặc điểm `switcher` mà khai Word -> Bad.
- Ký tự `!` trong mật khẩu/host làm lệch ChannelAddress; `.` trong GatewayID/topic làm lệch DeviceID.
- Trong XML phải escape `&` `<` `"` trong mật khẩu.
- Số thập phân parse theo culture của Windows.
- Mật khẩu lưu dạng văn bản thường.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MQTT_KingPigeon" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\KPMQTTClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="broker.example.com!1883!user!pass!5000!True!120000" />
    <Device>
      <DeviceName Value="Gateway1" />
      <DeviceID Value="BeiLai Gateway.True.kp/up.0.kp/down.False" />
      <Tag Name="PacketTime" Addrress="#Time" Type="String" ClientAccess="ReadOnly" Description="Time of last packet" />
      <Tag Name="Temperature" Addrress="Temp1" Type="Float" ClientAccess="ReadOnly" Description="Analog value flag Temp1" />
      <Tag Name="Relay1" Addrress="DO1" Type="Bool" ClientAccess="ReadWrite" Description="Switcher flag DO1" />
    </Device>
  </Channel>
</Root>
```
