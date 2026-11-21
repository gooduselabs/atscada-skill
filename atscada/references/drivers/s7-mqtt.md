# S7 MQTT (MQTT giá trị thô) - `S7MQTTClient.dll`

## 1. Driver dùng cho gì

- MQTT client đơn giản: **mỗi tag = một topic**, payload là **giá trị thô dạng text** (`123`, `45.6`, `1`, hoặc chuỗi) - không JSON.
- Tên gọi "S7" là do dùng với dữ liệu PLC Siemens S7 được gateway/bridge publish lên MQTT; driver **không có** logic S7 nào (không có DB/M/I/Q). Dùng được cho mọi nguồn publish giá trị thô.
- Device không mang cấu hình; topic/QoS/Retain nằm ở địa chỉ tag.
- DLL: `S7MQTTClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Nếu payload là JSON có nháy kiểu EMKO, dùng `emko-mqtt.md` - cùng cấu trúc địa chỉ.

## 2. ChannelAddress

**9 trường** phân cách bằng `!`; trường thứ 9 rỗng nên chuỗi **kết thúc bằng dấu `!`**. Ít hơn 9 trường -> lỗi chỉ số, mọi tag Bad.

```
Server!Port!User!Password!KeepAlive!CleanSession!True!TimeOut(ms)!
```

| # | Trường | Mặc định UI | Driver dùng thế nào |
|---|---|---|---|
| 1 | Server | `broker.mqttdashboard.com` | Host broker |
| 2 | Port | `1883` | Parse bằng Int16 -> **cổng phải <= 32767** và phải là số |
| 3 | User | `admin` | Luôn gửi credential |
| 4 | Password | (mẫu) | Luôn gửi credential |
| 5 | KeepAlive | `15` | **Không dùng** (driver không đặt keep-alive). Vẫn phải có để giữ vị trí |
| 6 | CleanSession | `True` | Phải là `True` hoặc `False` |
| 7 | (cố định) | `True` | Không dùng; UI luôn ghi `True`. Giữ nguyên `True` |
| 8 | TimeOut (ms) | `120000` | Tuổi tối đa của message; quá hạn -> tag Bad. Phải là số nguyên |
| 9 | (rỗng) | | Giữ dấu `!` cuối |

Ví dụ: `broker.example.com!1883!user!pass!15!True!True!120000!`

- Không bật được TLS. ClientId là GUID mới mỗi lần kết nối. Auto-reconnect 15 s.

## 3. DeviceID

- Driver **không phân tích** DeviceID. UI gán DeviceID = đúng tên device.
- Quy ước an toàn: ghi DeviceID giống DeviceName (ví dụ `PLC1`), không để rỗng.

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

Ví dụ: `plc1/db1/speed.1.False`

- Topic **không được chứa dấu `.`**.
- Thiếu QoS/Retain -> tag không subscribe được và không ghi được.

### Payload nhận

- Toàn bộ payload UTF-8 sau khi `Trim()` là giá trị. Ví dụ payload `45.6` -> 45.6.
- Payload JSON (`{"value":1}`) với Type số -> Bad; chỉ đọc được nguyên văn bằng Type `String`.

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
| String | Trả nguyên payload | Không kiểm tra |

Payload không phải số (với Type khác String) -> Bad. Payload `true`/`false` không đọc được bằng Bool (phải là `0`/`1`).

## 6. ReadOnly / ReadWrite

- UI luôn tạo tag `ReadWrite`. Driver không tự chặn ghi; muốn chỉ đọc thì khai `ClientAccess="ReadOnly"` trong ATFile.
- Ghi: publish **giá trị thô** (đúng chuỗi giá trị, không bọc JSON) lên **chính topic của tag** với QoS/Retain của tag.
- Sai kiểu trả `Wrong`; hợp lệ trả `Good` ngay, không chờ xác nhận và không báo lỗi publish.
- Message driver tự ghi **không bị lọc**: vì driver cũng subscribe topic đó nên giá trị vừa ghi quay lại thành giá trị đọc ngay. Nếu ghi với Retain = `True`, broker giữ giá trị đó và phát lại mỗi lần subscribe.

## 7. Tag hệ thống

Không có.

## 8. Block read

Không có. Mỗi topic subscribe riêng.

## 9. Lưu ý / lỗi hay gặp

- **TimeOut là độ tươi dữ liệu**: nguồn chỉ publish khi thay đổi thì sau TimeOut tag chuyển Bad. Đặt TimeOut lớn hơn chu kỳ publish.
- Thiếu dấu `!` cuối (chỉ 8 trường) -> mọi tag Bad.
- Ký tự `!` trong mật khẩu/host làm lệch trường; `.` trong topic làm hỏng địa chỉ tag.
- Trong XML phải escape `&` `<` `"` trong mật khẩu.
- Cổng > 32767 không dùng được.
- Tag chỉ có giá trị khi có message mới đến (hoặc message retained trên broker).
- Parse số theo culture của Windows (không ép InvariantCulture).
- Trạng thái kết nối dùng biến static dùng chung giữa các channel cùng driver.
- Mật khẩu lưu dạng văn bản thường.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MQTT_S7" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\S7MQTTClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="broker.example.com!1883!user!pass!15!True!True!120000!" />
    <Device>
      <DeviceName Value="PLC1" />
      <DeviceID Value="PLC1" />
      <Tag Name="Speed" Addrress="plc1/db1/speed.1.False" Type="Float" ClientAccess="ReadOnly" Description="Motor speed" />
      <Tag Name="Counter" Addrress="plc1/db1/counter.1.False" Type="DWord" ClientAccess="ReadOnly" Description="Counter" />
      <Tag Name="Start" Addrress="plc1/cmd/start.1.False" Type="Bool" ClientAccess="ReadWrite" Description="Start command" />
    </Device>
  </Channel>
</Root>
```
