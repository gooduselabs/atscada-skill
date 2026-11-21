# Bảng tra driver ATDriver Server

Mỗi driver có một file tham chiếu riêng trong cùng thư mục. Đọc file của driver trước khi viết ATFile: số field và ký tự phân cách phải đúng tuyệt đối, sai thì driver thường không báo lỗi mà chỉ cho mọi tag trạng thái Bad.

Đường dẫn DLL mặc định: `C:\Program Files\ATPro\ATDriverServer\Drivers\<Dll>.dll`.

Cột "Cài sẵn" cho biết DLL có trong thư mục Drivers của bản cài đã kiểm tra hay không. "Không" nghĩa là tên DLL chỉ lấy từ csproj.

## Bảng tổng hợp

| DLL | Cài sẵn | File | ChannelAddress | DeviceID | Ví dụ tag address | Ký tự không được nằm trong giá trị |
|---|---|---|---|---|---|---|
| `ModbusTCP.dll` | Có | `modbus-tcp.md` | `Lifetime` (1 số nguyên, giây), vd `3600` | `IP\|Port\|UnitID\|TimeOut\|OrderBy\|MaxReadTimes\|BlockSettings` - đúng 7 field, field cuối rỗng vẫn phải có `\|`. Vd `192.168.1.10\|502\|1\|1000\|1\|10\|4-1-1-100` | `000001`, `100001`, `300001`, `400001`, `400020.3` (bit) | `\|` trong DeviceID; `/` giữa các block, `-` trong block |
| `ModbusRTU.dll` | Có | `modbus-rtu.md` | `PortName.BaudRate.DataBits.Parity.StopBits.Timeout` - đúng 6 field, vd `COM3.9600.8.None.One.1000` | `UnitID\|OrderBy\|MaxReadTimes\|BlockSettings` - đúng 4 field, vd `1\|1\|20\|4-1-1-100` hoặc `2\|1\|1000\|` | giống Modbus TCP | `.` trong ChannelAddress; `\|` trong DeviceID; `/` và `-` trong block |
| `S7EthernetClient.dll` | Có | `s7-ethernet.md` | `502\|<lifetimeSec>` (`502` là hằng giữ chỗ, không phải port), vd `502\|900` | `IP\|Rack\|Slot\|MaxReadTimes\|BlockSettings` - đúng 5 field. Block nối bằng `/`: `DB-<pos>-<DBNumber>-<From>-<To>` hoặc `MB\|QB\|IB-<pos>-<From>-<To>`. Vd `192.168.1.10\|0\|1\|50\|DB-1-1-0-99/MB-1-0-15` | `DB1[0]`, `DB1[4].2`, `MB[10]`, `MB[10].0`, `QB[0].1`, `IB[0].7` | `\|` `/` `-` |
| `MitsubishiEthernet.dll` | Có | `mitsubishi.md` (phần A) | Chỉ tên dòng PLC, đúng hoa thường: `FX3U`, `QnA Series`, `Q Series`, `L Series`, `iQ-R Series`, ... | `Ip\|Port\|Timeout\|ReadBlockRate\|BlockSetting` - 5 field, `\|` cuối bắt buộc. Block `Area-Pos-From-Count` nối bằng `/`. Vd `192.168.1.10\|8000\|1000\|900\|X-1-0-16/D-1-0-100` | `X0`, `Y17` (octal với FX, hex với Q/L), `M100`, `D200` | `\|` `/` `-` |
| `MitsubishiSerial.dll` | Có | `mitsubishi.md` (phần B) | `COMx.Baud.DataBits.Parity.StopBits.ResponseTimeout` - 6 field, vd `COM7.115200.7.Even.One.1000` | `ReadBlockRate\|BlockSetting` - 2 field, `\|` bắt buộc. Vd `900\|` hoặc `900\|X-1-0-16/D-1-0-50` | `X0`, `Y10`, `M10`, `D100` (chữ hoa) | `.` trong ChannelAddress; `\|` `/` `-` trong DeviceID |
| `OmronHostLink.dll` | Có | `omron-hostlink.md` | `COMx.Baud.DataBits.Parity.StopBits.ResponseTimeout` - đúng 6 field, field 6 phải là số nguyên. Vd `COM1.9600.7.Even.One.10` | `DeviceId\|TimeBlockRead\|LoadFlag\|<I>\|<O>\|<D>\|<H>` - đúng 7 field; mỗi vùng gồm đúng 5 dòng nối bằng `^`, mỗi dòng `enable*start*count`, dòng không dùng là `0*0*0` | `0.1`, `100.0`, `H10.5`, `D100`, `H10` | `.` trong ChannelAddress; `\|` `^` `*` trong DeviceID |
| `DR404MQTTClient.dll` | Có | `dr404-mqtt.md` | `Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)` - đúng 7 field, vd `broker.example.com!1883!user!pass!5000!True!30000` | `SlaveID.CmdTopic.RespTopic.QoS.PollInterval.RespTimeout.FrameMode.AddressBase.ByteOrder.MaxRegs.FrameDelay[.FixedBlocks]` - 11 field, field 12 tùy chọn. Vd `1.dr404/dev1/cmd.dr404/dev1/raw.0.2000.3000.RTU.1.ABCD.50.100` | `400001`, `40001`, `300010`, `000001`, `400201.3`, `403909:CDAB`, `HR100`, `IR30`, `CO1`, `DI5`, `#Status`, `#LastUpdate` | `!` trong server/user/password; `.` `+` `#` và dấu cách trong topic |
| `EMKOMQTTClient.dll` | Có | `emko-mqtt.md` | `Server!Port!User!Password!KeepAlive!CleanSession!True!TimeOut(ms)!` - 9 field, field cuối rỗng nên chuỗi kết thúc bằng `!` | Không được parse; đặt bằng tên device | `<topic>.<QoS>.<Retain>`, vd `site1/pump1/speed.1.False` | `!` trong giá trị channel; `.` trong topic |
| `S7MQTTClient.dll` | Có | `s7-mqtt.md` | Giống EMKO: 9 field, kết thúc bằng `!` | Không được parse; đặt bằng tên device | `<topic>.<QoS>.<Retain>`, vd `plc1/db1/speed.1.False` | `!` trong giá trị channel; `.` trong topic |
| `KPMQTTClient.dll` | Có | `kingpigeon-mqtt.md` | `Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)` - 7 field | `GatewayID.UseGatewayID.SubscribeTopic.QoS.PublishTopic.Retain` - 6 field, vd `BeiLai Gateway.True.kp/up.0.kp/down.False` | `flag` của sensor: `Temp1`, `DO1`; `#Time`, `#UTC`; hoặc key JSON cấp cao nhất | `!` trong giá trị channel; `.` trong GatewayID, topic và flag |
| `WEINTEKMQTTClient.dll` | Có | `weintek-mqtt.md` | `Server!Port!User!Password!KeepAlive(ms)!CleanSession!TimeOut(ms)!EnableTLS` - 8 field, vd `broker.example.com!1883!user!pass!5000!True!120000!False` | `SubTopic.QoS.Retain` - 3 field, vd `weintek/hmi1/pub.0.True` | `AddressName.PubTopic.QoS`, vd `Test1.weintek/hmi1/sub/Test1.2` | `!` trong giá trị channel; `.` trong SubTopic, AddressName và PubTopic |
| `BACnetClient.dll` | Có | `bacnet.md` | `LocalIP!LocalPort!Timeout!Retries` - 4 field, mặc định `0.0.0.0!0!1500!0` | `IP:Port` hoặc `IP:Port:Network:MAC` - đúng 2 hoặc 4 phần, port bắt buộc (chuẩn 47808) | `AI:0:PV`, `AO:1:PV:8`, `BV:3:PV`, `DEV:1234:NAME`, `AO:1:PRIORITY[8]`, `2:5:85` | `!` trong channel; `:` trong device và tag |
| `HTTPClient.dll` | Có | `http.md` | `Timeout!CacheMs!IgnoreCert` - 3 field, mặc định `2500!500!0` | `BaseUrl\|AuthType\|User\|Secret\|Headers` - 5 field, chỉ BaseUrl bắt buộc; AuthType `None`/`Basic`/`Bearer`/`ApiKey`; Headers `Name: v;Name2: v2` | `/status\|data.temp\|\|\|`, `/room/1\|data.setpoint\|PUT\|/room/1/setpoint\|{"value":{json}}` | `!` trong channel; `\|` trong mọi field device và 4 phần đầu của tag; `;` trong giá trị header |
| `SNMPClient.dll` (cần `SnmpSharpNet.dll`) | Có | `snmp.md` | `Version!Community!AuthUser!SecurityLevel!AuthProtocol!AuthPassword!PrivProtocol!PrivPassword` - đúng 8 field (dạng cũ 7 field không có SecurityLevel vẫn nhận) | `IP.Port.Timeout.Retries` - 7 đoạn số với IPv4, vd `192.168.1.10.161.5000.1` | `1.3.6.1.2.1.1.1.0` (OID) | `!` trong community, user, password; không dùng hostname hay IPv6 trong DeviceID |
| `OPCDAClient.dll` (cần `Interop.OPCAutomation.dll`) | Có | `opcda-client.md` | ProgID của OPC server, vd `Kepware.KEPServerEX.V6` | Update rate (ms), số nguyên, mặc định `1000`; DeviceName là tên OPC Group | `Channel1.Device1.Tag1` (OPC Item ID đầy đủ) | Driver không tách chuỗi nào |
| `InternalMemory.dll` | Có | `internal-memory.md` | `InternalMemory\|<SavingTimeMs>` - 2 field, chuẩn `InternalMemory\|600000` | Chuỗi tự do, quy ước bằng DeviceName | Chuỗi tự do, quy ước bằng tên tag | `\|` trong channel; `,` và `*` trong ChannelName, DeviceID, tag address |
| `VisionCounterClient.dll` | Không | `vision-counter.md` | `Timeout!LiveCacheMs!TotalsCacheMs` - 3 field, mặc định `2500!1000!5000` | `Host:Port\|ApiKey` (thiếu `:Port` thì dùng 8090) | `Live\|1\|*\|*\|Total`, `Today\|*\|*\|thùng\|Total`, `Live\|1\|*\|*\|State`, `Command\|1\|*\|*\|Reset` - đúng 5 phần | `!` trong channel; `\|` trong tên zone/class; `/`, dấu cách, `?`, `#` trong Host |
| `iIEC104.dll` | Không | `iec104.md` | `Port` (1 số), vd `2404` | `IP\|CommonAddress\|Timeout\|SectorAddress\|BlockConfig\|BlockReadTimes` - đúng 6 field; BlockConfig gồm 12 giá trị số nối bằng `*`. Vd `192.168.1.10\|1\|5000\|0\|0*1*100*0*1*100*0*1*100*0*1*100\|10` | `100` (IOA), Type quyết định ASDU: `SinglePoint`, `DoublePoint`, `Float`, `MeasuredValue`, `ScaledValue` | `\|` trong DeviceID; `*` trong BlockConfig |
| `ModbusIEC104.dll` | Không, chưa dùng được | `modbus-iec104.md` | Không có trong source (chưa xác nhận) | Theo thiết kế: `IP\|Port\|COA\|K\|W\|T0\|T1\|T2\|T3\|InterrogationType\|InterrogationInterval\|BlockSettings` | Theo thiết kế: `CA.IOA.TypeID[.ElementIndex]`, vd `1.100.13` | `\|` trong DeviceID; `.` trong tag address |
| (không có DLL) `Driver Simulators.exe` | Không | `simulator-internal-memory.md` | Không phải driver. Công cụ chuyển ATFile sang dạng InternalMemory: ghi `InternalMemory\|600000` | DeviceID = DeviceName | Addrress = Name, Type `String`, ClientAccess `ReadWrite` | như InternalMemory |

## Lưu ý chung giữa các driver

Số field và ký tự phân cách:

- Sai số field không sinh lỗi. Device hoặc channel bị bỏ qua và mọi tag đọc ra Bad. Một số parser (BACnet, HTTP, VisionCounter, SNMP) còn tự thay giá trị mặc định cho field sai, nên cấu hình sai vẫn "chạy" với tham số khác ý muốn.
- Field cuối rỗng vẫn phải có ký tự phân cách: Modbus TCP `...|10|`, Modbus RTU `1|1|1000|`, S7 `192.168.1.10|0|1|1000|`, Mitsubishi Serial `900|`, EMKO và S7 MQTT kết thúc bằng `!`.
- Ký tự phân cách khác nhau theo driver và theo cấp. Không driver nào hỗ trợ escape. `!` trong mật khẩu MQTT làm hỏng channel; `.` trong topic, GatewayID hoặc flag làm hỏng DeviceID hay tag address.
- Số field channel của các driver MQTT khác nhau: DR404 và KingPigeon 7, WEINTEK 8, EMKO và S7 MQTT 9.
- Vị trí endpoint khác nhau: Modbus TCP đặt IP và port trong DeviceID; iIEC104 đặt port ở ChannelAddress và IP ở DeviceID; các driver serial đặt cổng COM ở ChannelAddress.
- Driver serial (Modbus RTU, Mitsubishi Serial, Omron) yêu cầu `Parity` là `None`/`Even`/`Odd` và `StopBits` là `One`/`Two`, đúng hoa thường.

Địa chỉ và kiểu dữ liệu:

- Modbus: vùng 1/3/4 phải viết đủ 6 chữ số. `40001` bị hiểu là Coil 40001, không phải Holding Register 1. Riêng DR404 có chấp nhận dạng 5 chữ số.
- `Type="Default"` chỉ là tiện ích của giao diện thiết kế ở S7, Mitsubishi, Omron và iIEC104; khi chạy thật tag sẽ Bad. Luôn ghi kiểu cụ thể. Ngoại lệ: OPC DA chấp nhận `Default`.
- Tên Type phân biệt hoa thường ở Mitsubishi, Omron và iIEC104 (`Word`, `DWord`, `Float`).
- `Long` là 32 bit ở S7, Mitsubishi, DR404, KingPigeon, WEINTEK; là 64 bit (4 word) ở Omron.
- X/Y của Mitsubishi là octal với FX và hex với Q/L, tùy tên dòng PLC trong ChannelAddress.
- Quy ước Bool khác nhau ở các driver MQTT: EMKO, S7 MQTT, KingPigeon dùng `0`/`1`; WEINTEK đọc JSON `true`/`false` nhưng ghi `0`/`1`.

Đọc block:

- "Đọc block mỗi N lần" đếm số lần đọc tag, không đếm thời gian. Modbus TCP ép N về tối đa 100; Modbus RTU không ép, nên giá trị mặc định 1000 của giao diện làm dữ liệu block rất cũ; iIEC104 chỉ làm mới block SinglePoint.
- Trường "position" trong block (`DB-1-...`, `X-1-...`, `4-1-...`) là số dòng giao diện 1..10. Runtime bỏ qua nhưng vẫn cần để đủ số field.
- BACnet, SNMP, HTTP, VisionCounter, OPC, InternalMemory không có đọc block. BACnet và SNMP gửi một request cho mỗi tag, nên tăng ChannelRate khi nhiều tag.

Ghi và ClientAccess:

- Đa số driver không tự kiểm tra ClientAccess; giao diện thiết kế của nhiều driver luôn sinh `ReadWrite`. Chỉ DR404 mặc định ReadOnly và từ chối ghi vào DI, IR và bit của register.
- Ghi được hay không còn tùy địa chỉ: HTTP cần WriteMethod trong tag address, VisionCounter chỉ ghi tag `Command`, OPC chỉ ghi khi item có quality Good.
- EMKO, S7 MQTT, KingPigeon, WEINTEK và Omron trả `Good` khi ghi mà không có xác nhận từ thiết bị.

Viết ATFile bằng tay:

- Escape XML trong thuộc tính: `&` thành `&amp;`, `<` thành `&lt;`, `"` thành `&quot;` (hay gặp ở mật khẩu MQTT và BodyTemplate của HTTP). Lưu file UTF-8.
- Import tag bằng CSV tách theo dấu `,` và không hỗ trợ dấu nháy, nên địa chỉ chứa dấu phẩy không đi qua CSV được.
- Mật khẩu, API key và community string nằm dạng văn bản thường trong ATFile.
- TimeOut ở channel của các driver MQTT là thời hạn dữ liệu còn mới, không phải timeout kết nối. Thiết bị chỉ publish khi có thay đổi sẽ chuyển Bad sau TimeOut.
- Topic MQTT được so khớp nguyên chuỗi; wildcard không dùng được.
- BACnet, HTTP, VisionCounter giữ device ở trạng thái offline 10 giây sau một lần timeout.

Bản cài và source:

- DLL đã cài có thể cũ hơn source. `MitsubishiEthernet.dll` đã cài chỉ chứa tên dòng `FX3U`, `QnA Series`, `A Series`; ưu tiên `FX3U` hoặc `QnA Series`.
- `VisionCounterClient.dll`, `iIEC104.dll`, `ModbusIEC104.dll` không có trong thư mục Drivers đã cài. "ModbusIEC104" không phải driver Modbus và chưa nạp được. Simulator là file exe, không được đặt vào ChannelDriverLocation.
