# DR404 MQTT (Modbus RTU qua MQTT) - `DR404MQTTClient.dll`

## 1. Driver dùng cho gì

- Modbus **master tổng quát** đi qua MQTT: đọc/ghi mọi thiết bị Modbus RTU nằm sau gateway USR-DR404 (hoặc gateway serial <-> MQTT trong suốt bất kỳ).
- Driver publish khung Modbus nhị phân (FC01/02/03/04 đọc, FC05/06/16 ghi) lên **CmdTopic**; gateway đẩy xuống RS485 và publish phản hồi thô lên **RespTopic**. Payload là khung nhị phân, không phải JSON.
- DLL: `DR404MQTTClient.dll` (đã có trong `C:\Program Files\ATPro\ATDriverServer\Drivers\`).
- Phía DR404: bật MQTT, **Pub Topic = RespTopic** (QoS 0, không retain), **Sub Topic = CmdTopic**, Client ID riêng.

## 2. ChannelAddress

Đúng **7 trường**, phân cách bằng `!`. Khác 7 trường thì driver **không kết nối và không báo lỗi**.

```
Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)
```

| # | Trường | Mặc định | Ý nghĩa |
|---|---|---|---|
| 1 | Server | `127.0.0.1` | Host/IP broker |
| 2 | Port | `1883` | Cổng broker; không parse được thì dùng 1883 |
| 3 | User | rỗng | Để rỗng thì không gửi credential (broker không xác thực) |
| 4 | Password | rỗng | Mật khẩu broker (chỉ dùng khi User khác rỗng) |
| 5 | KeepAlive | `5000` | ms; UI yêu cầu >= 1000; parse lỗi -> 5000 |
| 6 | CleanSession | `True` | `True`/`False`; parse lỗi -> True |
| 7 | TimeOut | `30000` | ms; dữ liệu cache cũ hơn mức này -> tag Bad, `#Status` = 0; UI yêu cầu >= 1000 |

Ví dụ: `broker.example.com!1883!user!pass!5000!True!30000`
Không xác thực (User, Password rỗng nhưng vẫn giữ đủ dấu `!`): `192.168.1.10!1883!!!5000!True!30000`

- Không có TLS. ClientId tự sinh (`ATSCADA_DR404_<8 ký tự>`), không cấu hình được.
- Topic không nằm ở Channel mà nằm ở DeviceID.

## 3. DeviceID

**11 trường** phân cách bằng `.`, cộng trường thứ 12 tùy chọn (Read Blocks). Số trường khác 11/12 hoặc bất kỳ trường nào sai -> cả device Bad.

```
SlaveID.CmdTopic.RespTopic.QoS.PollInterval.RespTimeout.FrameMode.AddressBase.ByteOrder.MaxRegs.FrameDelay[.FixedBlocks]
```

| # | Trường | Mặc định | Giá trị hợp lệ / driver ép |
|---|---|---|---|
| 1 | SlaveID | 1 | 1-247 |
| 2 | CmdTopic | `dr404/cmd` | Topic gateway **subscribe** (driver publish lệnh). Không rỗng |
| 3 | RespTopic | `dr404/raw` | Topic gateway **publish** (driver subscribe). Không rỗng, phải khác CmdTopic |
| 4 | QoS | 0 | 0/1/2 |
| 5 | PollInterval (ms) | 2000 | Chu kỳ đọc tất cả tag của device; < 500 bị ép lên 500 |
| 6 | RespTimeout (ms) | 1500 | Chờ 1 phản hồi; ép vào 300-10000 |
| 7 | FrameMode | `RTU` | `RTU` (khuyên dùng, gateway Transparent) hoặc `TCP` (MBAP) |
| 8 | AddressBase | 0 | Chỉ `0` hoặc `1`. 0 = offset giao thức, 1 = địa chỉ 1-based theo tài liệu thiết bị. Chỉ áp cho dạng `HR/IR/CO/DI + số` |
| 9 | ByteOrder | `ABCD` | `ABCD`, `CDAB`, `BADC`, `DCBA` - mặc định cho kiểu 32/64 bit |
| 10 | MaxRegs | 50 | Số thanh ghi tối đa mỗi lệnh đọc; ép vào 1-120 |
| 11 | FrameDelay (ms) | 100 | Nghỉ bus sau mỗi giao dịch; < 50 bị ép lên 50 |
| 12 | FixedBlocks | (bỏ) | Xem mục 8 |

Ví dụ: `1.dr404/dev1/cmd.dr404/dev1/raw.0.2000.3000.RTU.1.ABCD.50.100`

- Topic **không được chứa** `.` (làm lệch số trường), `+`, `#`, dấu cách.
- Nhiều slave sau cùng một DR404: tạo nhiều Device **cùng CmdTopic và cùng RespTopic**, khác SlaveID. Driver xếp hàng tuần tự theo CmdTopic.

## 4. Tag address

Hai dạng tương đương (không phân biệt hoa thường):

```
Modicon 6 hoặc 5 chữ số [.bit] [:ByteOrder]     400001  40001  300010  000001  100005  400201.3  403909:CDAB
AREA + số [.bit] [:ByteOrder]                   HR100  IR30  CO1  DI5  HR200.3  HR3909:CDAB
```

- Chữ số đầu / AREA: `0`/`CO` = Coil, `1`/`DI` = Discrete input, `3`/`IR` = Input register, `4`/`HR` = Holding register.
- Dạng Modicon **luôn 1-based** (`400001` = offset 0), bỏ qua AddressBase. 6 chữ số: phần số 00001-65536; 5 chữ số: 0001-9999.
- Dạng `AREA + số` (số 1-5 chữ số): offset = số - AddressBase của device.
- `.bit`: 0-15, chỉ dùng trên IR/HR và kiểu phải là `Bool`.
- `:ByteOrder`: ghi đè ByteOrder của device cho riêng tag (chỉ có ý nghĩa với kiểu 32/64 bit).

## 5. Kiểu dữ liệu

| Type | Số thanh ghi | Ghi chú |
|---|---|---|
| Bool | 1 bit (coil/DI) hoặc 1 bit của thanh ghi | Coil/DI **bắt buộc** Bool; Bool trên IR/HR **bắt buộc** có `.bit` |
| Word | 1 | ushort |
| Short | 1 | short |
| DWord | 2 | uint |
| Long | 2 | int 32 bit |
| Float | 2 | IEEE-754 |
| Double | 4 | IEEE-754 |
| String | - | **Không hỗ trợ** cho tag Modbus, chỉ dùng cho `#LastUpdate` |

Không có scale/offset trong driver.

## 6. ReadOnly / ReadWrite

- Ghi được: `CO`/`0xxxxx` (FC05, giá trị `1/0/true/false`) và **nguyên thanh ghi** `HR`/`4xxxxx` (FC06 cho 1 thanh ghi, FC16 cho nhiều).
- Không ghi được: `DI`, `IR`, và **bit trong thanh ghi** (`HR200.3`) -> luôn trả Bad. Khai báo các tag này là `ReadOnly`.
- Giá trị ghi số dùng dấu chấm thập phân (InvariantCulture).
- Chống ghi lặp: cùng giá trị lặp lại trong 5 s -> trả kết quả cũ, không ra bus; giá trị khác ghi cách lần trước < 500 ms -> Bad.

## 7. Tag hệ thống

| Address | Type | Ý nghĩa |
|---|---|---|
| `#Status` | Bool | 1 = device còn phản hồi trong TimeOut của channel, 0 = mất |
| `#LastUpdate` | String | Thời điểm phản hồi tốt cuối, `yyyy-MM-dd HH:mm:ss` |

## 8. Block read

- Mặc định driver tự gộp các địa chỉ tag gần nhau (cách <= 8) thành một lệnh <= MaxRegs. Không cần khai block.
- Trường thứ 12 (FixedBlocks) dùng khi thiết bị chỉ cho đọc **nguyên khối**: tag nằm trong khối sẽ luôn được đọc cùng cả khối.
- Định dạng: `Vùng-Dòng-From-To`, nhiều khối cách nhau bằng `/`. Vùng `0`/`1`/`3`/`4`; Dòng 1-10 (vị trí trong bảng UI); From/To **1-based**, 1-65536, From <= To.
  Ví dụ: `4-1-101-140/4-2-3901-3974` -> DeviceID `3.dr404/pm/cmd.dr404/pm/raw.0.2000.1500.RTU.1.CDAB.50.100.4-1-101-140/4-2-3901-3974`
- Dạng cũ vẫn đọc được: `400101-400140;300001-300020`.
- Các khối cùng vùng không được chồng lấn (chồng lấn -> DeviceID không hợp lệ). Khối dài hơn MaxRegs tự chia nhỏ -> đặt MaxRegs >= khối phải đọc nguyên. Khối chỉ được đọc khi có tag dùng nó.

## 9. Lưu ý / lỗi hay gặp

- Sai số trường (Channel khác 7, Device khác 11/12) -> im lặng, mọi tag Bad.
- Ký tự `!` trong Server/User/Password làm hỏng ChannelAddress; `.` trong topic làm hỏng DeviceID.
- Trong file XML, ký tự `&` `<` `"` trong mật khẩu phải escape (`&amp;` `&lt;` `&quot;`).
- CmdTopic và RespTopic phải khác nhau; các device chung CmdTopic phải chung RespTopic.
- Không để master khác (ví dụ Modbus TCP cổng 502 của DR404) poll cùng slave: RTU không có mã giao dịch nên có thể nhận nhầm phản hồi. Mỗi bus chỉ một channel driver.
- Bool trên thanh ghi mà thiếu `.bit`, hoặc coil mà Type khác Bool -> tag Bad.
- Giá trị sai thứ tự byte: đổi ByteOrder ở device hoặc thêm hậu tố `:CDAB` cho tag.
- Tag sai địa chỉ (exception 02) bị treo 30 s rồi thử lại; không ảnh hưởng tag khác. Device không phản hồi thì chu kỳ poll tự giãn tới tối đa 60 s.
- Không hỗ trợ FC15 và ghi bit trong thanh ghi.

## 10. ATFile mẫu

```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="MQTT_DR404" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\DR404MQTTClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="broker.example.com!1883!user!pass!5000!True!30000" />
    <Device>
      <DeviceName Value="Meter1" />
      <DeviceID Value="1.dr404/dev1/cmd.dr404/dev1/raw.0.2000.3000.RTU.1.ABCD.50.100" />
      <Tag Name="Status" Addrress="#Status" Type="Bool" ClientAccess="ReadOnly" Description="Communication OK" />
      <Tag Name="LastUpdate" Addrress="#LastUpdate" Type="String" ClientAccess="ReadOnly" Description="Last good response" />
      <Tag Name="Voltage_L1" Addrress="400014" Type="Float" ClientAccess="ReadOnly" Description="Voltage L1" />
      <Tag Name="Energy" Addrress="400002:CDAB" Type="Float" ClientAccess="ReadOnly" Description="Total energy, word swapped" />
      <Tag Name="Setpoint" Addrress="400100" Type="Word" ClientAccess="ReadWrite" Description="Setpoint" />
      <Tag Name="Alarm_Bit3" Addrress="400201.3" Type="Bool" ClientAccess="ReadOnly" Description="Bit 3 of 400201" />
      <Tag Name="Relay1" Addrress="000001" Type="Bool" ClientAccess="ReadWrite" Description="Coil 1" />
    </Device>
  </Channel>
</Root>
```
