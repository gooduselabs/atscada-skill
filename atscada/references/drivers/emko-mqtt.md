# EMKO MQTT - `EMKOMQTTClient.dll`

## 1. Driver dùng cho gì

- MQTT client đơn giản: **mỗi tag = một topic**. Payload nhận là JSON nhỏ kiểu thiết bị EMKO, giá trị nằm trong chuỗi có nháy kép; payload ghi là `{"data": { "value" : X}}`.
- Device không mang cấu hình gì (chỉ là nhóm tag); toàn bộ topic/QoS/Retain nằm ở địa chỉ tag.
- DLL: `EMKOMQTTClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Nếu payload là giá trị thô không JSON, dùng driver S7 MQTT (`s7-mqtt.md`) - cùng cấu trúc địa chỉ.

## 2. ChannelAddress

**9 trường** phân cách bằng `!`; trường thứ 9 rỗng nên chuỗi **kết thúc bằng dấu `!`**. Thiếu trường (ít hơn 9) -> driver lỗi chỉ số, mọi tag Bad.

```
Server!Port!User!Password!KeepAlive!CleanSession!True!TimeOut(ms)!
```

| # | Trường | Mặc định UI | Driver dùng thế nào |
|---|---|---|---|
| 1 | Server | `broker.mqttdashboard.com` | Host broker |
| 2 | Port | `1883` | Parse bằng Int16 -> **cổng phải <= 32767** và phải là số |
| 3 | User | `admin` | Luôn gửi credential |
| 4 | Password | (mẫu) | Luôn gửi credential |
| 5 | KeepAlive | `15` | **Không dùng** (keep-alive cố định 5 s trong code). Vẫn phải có để giữ vị trí |
| 6 | CleanSession | `True` | Phải là `True` hoặc `False` (sai -> không kết nối) |
| 7 | (cố định) | `True` | Không dùng; UI luôn ghi `True`. Giữ nguyên `True` |
| 8 | TimeOut (ms) | `120000` | Tuổi tối đa của message; quá hạn -> tag Bad. Phải là số nguyên |
| 9 | (rỗng) | | Giữ dấu `!` cuối |

Ví dụ: `broker.example.com!1883!user!pass!15!True!True!120000!`

- Không có TLS. ClientId là GUID mới mỗi lần kết nối. Auto-reconnect 5 s.

## 3. DeviceID

- Driver **không phân tích** DeviceID. UI gán DeviceID = đúng tên device.
- Quy ước an toàn: ghi DeviceID giống DeviceName (ví dụ `Device1`), không để rỗng.

## 4. Tag address

Đúng **3 phần** phân cách bằng `.`:

```
<topic>.<QoS>.<Retain>
```

| Phần | Giá trị |
|---|---|
| topic | Topic MQTT đầy đủ, vừa subscribe để đọc vừa publish khi ghi. So khớp **chính xác**, không dùng wildcard `+`/`#` |
| QoS | `0`, `1` hoặc `2` |
| Retain | `True` hoặc `False` - cờ retain khi **ghi** |

Ví dụ: `site1/pump1/speed.1.False`

- Topic **không được chứa dấu `.`** (driver tách bằng `.` và lấy phần đầu làm topic).
- Thiếu QoS/Retain -> tag không subscribe được và không ghi được.

### Payload nhận

- Driver lấy `payload.Split('"')[3]`, tức **chuỗi nằm trong cặp nháy kép thứ hai** của payload - không tìm theo tên khóa.
  - `{"value":"25.5"}` -> `25.5`
  - `{"Status":"1","Value":"100"}` -> `1` (giá trị đầu tiên có nháy, không phải `Value`)
- Giá trị **phải nằm trong nháy kép**. `{"value":25.5}` (số không nháy) -> Bad.
- Message có chứa `{"data":` bị **bỏ qua** (coi là echo của lệnh ghi do driver gửi).

## 5. Kiểu dữ liệu

MQTT không có khái niệm thanh ghi; Type chỉ quyết định cách ép chuỗi nhận được.

| Type | Khi đọc | Khi ghi (kiểm tra) |
|---|---|---|
| Bool | 0/1 giữ nguyên, số khác -> `1` | Chỉ nhận `0` hoặc `1` |
| Word | Kẹp 0-65535, bỏ phần sau dấu `.` | UInt16 |
| Short | Kẹp -32768..32768, bỏ phần thập phân | Int16 |
| DWord | Kẹp 0-4294967296, bỏ phần thập phân | UInt32 |
| Long | Bỏ phần thập phân | Int64 |
| Float / Double | Trả nguyên chuỗi nếu parse được | float / double |
| String | Trả nguyên chuỗi | Không kiểm tra |

Giá trị không phải số (với Type khác String) -> Bad.

## 6. ReadOnly / ReadWrite

- UI luôn tạo tag `ReadWrite`. Driver không tự chặn ghi theo vùng nhớ; muốn chỉ đọc thì khai `ClientAccess="ReadOnly"` trong ATFile.
- Ghi: publish lên **chính topic của tag** với QoS/Retain của tag:
  - kiểu số/Bool: `{"data": { "value" : 25.5}}`
  - String: `{"data": { "value" : "abc"}}`
- Sai kiểu trả `Wrong`; hợp lệ trả `Good` ngay, **không chờ** thiết bị xác nhận.
- Vì ghi và đọc chung một topic, thiết bị phải publish trạng thái theo dạng JSON có nháy (không chứa `{"data":`) thì giá trị đọc mới cập nhật.

## 7. Tag hệ thống

Không có.

## 8. Block read

Không có. Mỗi topic subscribe riêng.

## 9. Lưu ý / lỗi hay gặp

- **TimeOut là độ tươi dữ liệu**: thiết bị chỉ publish khi thay đổi thì sau TimeOut tag chuyển Bad. Đặt TimeOut lớn hơn chu kỳ publish của thiết bị.
- Thiếu dấu `!` cuối (chỉ 8 trường) là lỗi hay gặp nhất -> mọi tag Bad.
- Ký tự `!` trong mật khẩu/host làm lệch trường; `.` trong topic làm hỏng địa chỉ tag.
- Trong XML phải escape `&` `<` `"` trong mật khẩu.
- Cổng > 32767 không dùng được.
- Tag mới thêm chỉ có giá trị khi có message mới đến (hoặc message retained trên broker).
- Parse số theo culture của Windows (không ép InvariantCulture).
- Trạng thái kết nối dùng biến static dùng chung giữa các channel cùng driver: một channel mất kết nối có thể làm channel EMKO khác trả Bad.
- Mật khẩu lưu dạng văn bản thường.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MQTT_EMKO" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\EMKOMQTTClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="broker.example.com!1883!user!pass!15!True!True!120000!" />
    <Device>
      <DeviceName Value="Device1" />
      <DeviceID Value="Device1" />
      <Tag Name="Temperature" Addrress="site1/dev1/temperature.1.False" Type="Float" ClientAccess="ReadOnly" Description="Temperature" />
      <Tag Name="Setpoint" Addrress="site1/dev1/setpoint.1.False" Type="Word" ClientAccess="ReadWrite" Description="Setpoint" />
      <Tag Name="Run" Addrress="site1/dev1/run.1.False" Type="Bool" ClientAccess="ReadWrite" Description="Run command" />
    </Device>
  </Channel>
</Root>
```
