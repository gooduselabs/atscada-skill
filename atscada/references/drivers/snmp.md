# SNMP - `SNMPClient.dll`

Nguồn xác nhận: README + source (`SNMPDriver.cs`, `SnmpHelper.cs`, các `ctl*.cs`). DLL có trong thư mục cài đặt `C:\Program Files\ATPro\ATDriverServer\Drivers\`, kèm thư viện phụ `SnmpSharpNet.dll` (phải nằm cùng thư mục).

## 1. Driver dùng cho gì
- Đọc (GET) / ghi (SET) giá trị theo OID qua SNMP **v1, v2c, v3** (UDP, cổng mặc định 161). Dùng cho UPS, switch, router, cảm biến môi trường, máy in...
- Không có GETBULK/WALK, không nhận trap.
- DLL: `SNMPClient.dll` (+ `SnmpSharpNet.dll`).

## 2. ChannelAddress
Định dạng: `Version!Community!AuthUser!SecurityLevel!AuthProtocol!AuthPassword!PrivProtocol!PrivPassword` - **đúng 8 trường, phân cách `!`** (trường không dùng để rỗng nhưng vẫn phải có dấu `!`).

| # | Trường | Giá trị | Ý nghĩa |
|---|---|---|---|
| 1 | Version | `v1`, `v2c`, `v3` (giá trị lạ -> v2c) | Phiên bản SNMP |
| 2 | Community | chuỗi, vd `public` | Dùng cho v1/v2c (v3 bỏ qua) |
| 3 | AuthUser | chuỗi | Tên user v3 |
| 4 | SecurityLevel | `noAuthNoPriv`, `authNoPriv`, `authPriv` (đúng hoa thường) | Mức bảo mật v3. Giá trị không hợp lệ -> tự suy ra từ AuthProtocol/PrivProtocol |
| 5 | AuthProtocol | `None`, `MD5`, `SHA` | SHA = SHA-1. Không có SHA-2 |
| 6 | AuthPassword | chuỗi | Bắt buộc khi authNoPriv/authPriv |
| 7 | PrivProtocol | `None`, `DES`, `AES128` | Không có AES192/256 |
| 8 | PrivPassword | chuỗi | Bắt buộc khi authPriv |

- **Số trường là điểm dễ sai nhất**: nếu không phải đúng 8 trường (hoặc 7 trường kiểu cũ, không có SecurityLevel) thì driver **âm thầm dùng mặc định** `v2c` / community `public` / noAuthNoPriv - không báo lỗi.
- Định dạng cũ 7 trường vẫn đọc được: `Version!Community!AuthUser!AuthProtocol!AuthPassword!PrivProtocol!PrivPassword`. File mới luôn dùng 8 trường.
- Giá trị không được chứa `!` (community/mật khẩu có `!` sẽ làm lệch số trường).
- Ví dụ:
  - v2c: `v2c!public!!authPriv!None!!None!` (đúng chuỗi mà giao diện sinh ra cho v2c mặc định; SecurityLevel không có tác dụng với v1/v2c)
  - v1: `v1!public!!noAuthNoPriv!None!!None!`
  - v3 authPriv: `v3!!user!authPriv!SHA!authpass!AES128!privpass`
  - v3 authNoPriv: `v3!!user!authNoPriv!MD5!authpass!None!`

## 3. DeviceID
Định dạng: `IP.Port.Timeout.Retries` - **phân cách bằng dấu chấm**; 3 đoạn cuối là Port, Timeout, Retries, phần còn lại là IP. Với IPv4 tổng cộng là **7 đoạn số**.

| Trường | Mặc định | Ý nghĩa |
|---|---|---|
| IP | (bắt buộc; DeviceID rỗng -> 127.0.0.1) | IPv4 của agent SNMP. Không dùng được hostname/IPv6. |
| Port | `161` | 1..65535 |
| Timeout (ms) | `5000` | thời gian chờ mỗi request |
| Retries | `1` | số lần thử lại, >= 0 |

- Ví dụ: `192.168.1.10.161.5000.1` -> IP 192.168.1.10, port 161, timeout 5000 ms, retries 1.
- **Bẫy**: chỉ ghi IP trần `192.168.1.10` (4 đoạn) sẽ bị hiểu là IP=`192`, Port=168, Timeout=1, Retries=10 -> không đọc được. Luôn ghi đủ 7 đoạn.
- Timeout mặc định 5000 ms lớn hơn read timeout 3 s mà các driver khác cùng bộ nhắc tới; nếu thiết bị hay mất kết nối, cân nhắc giảm (vd `...161.2000.0`). Ảnh hưởng thực tế với SNMP: chưa xác nhận.

## 4. Tag address
Địa chỉ = **OID dạng số**, vd `1.3.6.1.2.1.1.1.0` (sysDescr.0). Dấu chấm đầu (`.1.3.6...`) và khoảng trắng được bỏ khi gửi.
- OID vô hướng phải có hậu tố instance `.0`; OID trong bảng kết thúc bằng chỉ số hàng (vd `1.3.6.1.2.1.2.2.1.10.3` = ifInOctets của interface 3).
- Giao diện yêu cầu OID bắt đầu bằng `1.3.` (hoặc `.1.3.`).
- Không dùng được tên MIB (`sysDescr.0`), không có truy cập bit, không có hậu tố.

## 5. Kiểu dữ liệu
`Bool`, `Word`, `Short`, `DWord`, `Long`, `Float`, `Double`, `String`. Không có register/byte; giá trị SNMP được đổi sang chuỗi rồi parse **nghiêm ngặt** theo Type (sai kiểu/ngoài phạm vi -> Bad):

| Kiểu SNMP trả về | Giá trị thô | Type nên dùng |
|---|---|---|
| Integer32 | số nguyên có dấu | `Long` (hoặc `Short` nếu nhỏ) |
| Counter32 / Gauge32 | số không dấu 32 bit | `DWord` |
| Counter64 | số không dấu 64 bit | `Double` hoặc `String` (DWord sẽ Bad khi vượt 32 bit) |
| TimeTicks | số centisecond thô (không đổi sang thời gian) | `DWord` |
| OctetString | chuỗi | `String` (hoặc `Float`/`Double` nếu chuỗi là số) |

- `Bool`: giá trị nguyên **bằng 1 -> 1, mọi số khác -> 0** (TruthValue 2 = false).
- `Word` 0..65535, `Short` -32768..32767, `DWord` uint32, `Long` int32. Không làm tròn: giá trị `23.5` với Type nguyên -> Bad.
- NoSuchObject / NoSuchInstance / EndOfMibView / Null / ErrorStatus != 0 -> Bad.
- Không có scaling (nhiều thiết bị trả giá trị x10, x100 - xử lý ở phía ứng dụng).

## 6. ReadOnly / ReadWrite
- Driver không kiểm tra ClientAccess; agent từ chối OID chỉ đọc -> `Bad`. Đa số OID là chỉ đọc -> đặt `ReadOnly`; chỉ đặt `ReadWrite` cho OID read-write và community/user có quyền ghi.
- Kiểu SNMP khi SET theo Type của tag: `Bool` -> Integer32 0/1; `Word`/`DWord` -> Gauge32; `Short`/`Long` -> Integer32; `Float`/`Double` -> OctetString (chuỗi số - nhiều agent từ chối); `String` -> OctetString.

## 7. Tag hệ thống / đặc biệt
Không có tag trạng thái của driver. Có thể dùng OID chuẩn làm tag kiểm tra kết nối: `1.3.6.1.2.1.1.3.0` (sysUpTime, DWord), `1.3.6.1.2.1.1.5.0` (sysName, String).

## 8. Block read
Không có. Mỗi tag = một GET riêng (v3 còn thêm bước discovery cho mỗi request) -> nhiều tag/v3 nên tăng ChannelRate.

## 9. Lưu ý / lỗi hay gặp
- ChannelAddress sai số trường -> chạy như v2c/public mà không báo lỗi; thiết bị v3 sẽ toàn Bad.
- DeviceID thiếu 3 đoạn cuối -> Bad toàn bộ (xem bẫy ở mục 3).
- Thiếu `SnmpSharpNet.dll` cạnh `SNMPClient.dll` -> driver không nạp/không đọc được.
- Mọi lỗi bị nuốt: chỉ thấy tag Bad, không có mã lỗi. Kiểm tra theo thứ tự: ping, cổng UDP 161/firewall, community/user, OID có `.0`, Type.
- Community và mật khẩu v3 lưu dạng văn bản thuần trong ChannelAddress.
- Một Channel = một bộ thông số version/community; thiết bị khác community phải tách Channel.

## 10. ATFile mẫu
```xml
<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<Root>
  <Channel>
    <ChannelName Value="SNMP1" />
    <ChannelDriverLocation Value="C:\Program Files\ATPro\ATDriverServer\Drivers\SNMPClient.dll" />
    <ChannelRate Value="1000" />
    <ChannelMaxWTimes Value="10" />
    <ChannelAddress Value="v2c!public!!authPriv!None!!None!" />
    <Device>
      <DeviceName Value="UPS1" />
      <DeviceID Value="192.168.1.10.161.5000.1" />
      <Tag Name="SysDescr" Addrress="1.3.6.1.2.1.1.1.0" Type="String" ClientAccess="ReadOnly" Description="sysDescr" />
      <Tag Name="SysUpTime" Addrress="1.3.6.1.2.1.1.3.0" Type="DWord" ClientAccess="ReadOnly" Description="sysUpTime (1/100 s)" />
      <Tag Name="IfInOctets1" Addrress="1.3.6.1.2.1.2.2.1.10.1" Type="DWord" ClientAccess="ReadOnly" Description="ifInOctets port 1" />
      <Tag Name="SysContact" Addrress="1.3.6.1.2.1.1.4.0" Type="String" ClientAccess="ReadWrite" Description="sysContact" />
    </Device>
  </Channel>
</Root>
```
Channel SNMP v3 chỉ khác dòng: `<ChannelAddress Value="v3!!user!authPriv!SHA!authpass!AES128!privpass" />`
