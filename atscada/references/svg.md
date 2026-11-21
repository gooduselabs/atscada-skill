# Sơ đồ SVG gắn tag (`atscada-svg`)

Dùng khi cần một hình minh hoạ hệ thống (sơ đồ một sợi, P&ID, sơ đồ công nghệ, mặt bằng) có số liệu và trạng thái chạy theo tag. Toàn bộ SVG được nhúng vào thuộc tính `at-content`; mỗi thẻ con `atscada-svg...-item` trỏ tới **một phần tử trong SVG bằng `id`** (ghi ở `at-name`) và gắn nó với một tag.

Ngữ pháp đầy đủ của từng loại item: `references/web-components.md`, mục C. Chuẩn hình thức và bố cục: `references/design.md` (đọc trước khi vẽ).

## Phong cách: hỏi người dùng, không tự chọn

Trước khi vẽ sơ đồ đầu tiên của project, hỏi người dùng muốn phong cách nào và ghi vào `SVG_STYLE` trong `model.js`:

- `scada-dark`: chuẩn màn hình SCADA (ISA-101) nền xám đậm. Đề xuất mặc định khi người dùng chưa có ý.
- `scada-light`: cùng chuẩn, nền xám nhạt.
- `dashboard`: bảng điều khiển hiện đại, khung bo góc, mỗi đại lượng một màu nhấn.
- `illustrated`: minh hoạ sinh động, có hình vẽ máy với bộ phận chuyển động khi máy chạy và khối nhà máy dạng phối cảnh.
- Chuẩn riêng của nhà máy hoặc theo ảnh/SVG mẫu họ đưa: lấy phong cách gần nhất rồi ghi đè màu trong `C`.

Mô tả từng phong cách, những câu cần hỏi kèm (nền tối/sáng, quy ước màu trạng thái, có dùng chuyển động không) và các nguyên tắc chung nằm ở `references/design.md`, mục "Sơ đồ SVG". Dù phong cách nào: trạng thái có cả màu và chữ, chuyển động chỉ khi máy đang chạy, bố cục kín và cân. Hỏi luôn người dùng muốn thiết bị vẽ bằng ký hiệu chuẩn hay bằng hình máy minh hoạ.

Người dùng chưa chắc: làm một khung mẫu, render ảnh ở hai phong cách (đổi `SVG_STYLE` rồi chạy `node tools/preview.js`), cho họ chọn. Mã vẽ không phải sửa khi đổi phong cách, miễn là màu số liệu lấy qua `C.Q('<đại lượng>')` thay vì viết mã màu trực tiếp.

## Quy trình

1. **Chốt phong cách** (mục trên) **và nội dung** với người dùng: sơ đồ gồm thiết bị gì, nối với nhau thế nào, mỗi thiết bị hiện những số nào, trạng thái lấy từ tag nào, chỗ nào bấm sang trang khác hoặc điều khiển. Hỏi luôn nhà máy có quy ước màu trạng thái không (có nơi dùng đỏ = đang chạy, xanh = dừng).
2. **Phác bố cục bằng số trước khi vẽ**: liệt kê các khung, tính kích thước để chúng lấp đầy khung vẽ (hàm `grid`), rồi mới điền nội dung.
3. **Vẽ bằng `tools/lib/svglib.js` và `tools/lib/symbols.js`** trong `tools/scenes.js`: mỗi sơ đồ một hàm trả về đối tượng `Svg`. Lệnh vẽ phần tử động vừa tạo phần tử vừa đăng ký liên kết tag.
4. **Làm một khung mẫu trước**, render ra ảnh (`node tools/preview.js <tên>`), mở PNG trong `svg\preview\` để nhìn, sửa tới khi đạt rồi mới nhân bản bằng vòng lặp.
5. **Gắn vào trang** bằng `W.svg('<tên>', scenes.xxxSvg())` trong `pages.js`, rồi `node tools/gen.js` để đối chiếu id và tag. `gen.js` cảnh báo khi các khung phủ dưới 70 % khung vẽ.

Ảnh xem thử chỉ kiểm tra hình tĩnh với số giả; màu theo trạng thái, cảnh báo, liên kết phải xem trên web chạy thật, và nói rõ với người dùng phần nào chưa xem.

Người dùng đưa sẵn file SVG (vẽ bằng Inkscape, iSVG...): đặt id có nghĩa cho các phần tử động, bỏ `width`/`height` cố định (giữ `viewBox`), khai báo item theo các loại bên dưới; nhúng bằng script (thư viện escape), không dán tay.

## Luật của web, sai là phần tử đứng im (không báo lỗi)

- Web tìm phần tử bằng `document.getElementById` trên **cả trang**: id phải duy nhất trong cả trang. **Mỗi trang tối đa một sơ đồ.** Id chỉ gồm chữ, số, gạch dưới, bắt đầu bằng chữ.
- **Hiện số**: nội dung phần tử bị ghi đè toàn bộ bằng chuỗi giá trị của tag. Dùng một `<text>` riêng cho số; nhãn và đơn vị là `<text>` tĩnh khác. Web không làm tròn: muốn một số lẻ thì nguồn phải ghi sẵn `"12.5"`.
- **Đổi màu** chỉ tác động `fill` của đúng phần tử có id. Thứ cần đổi màu theo trạng thái phải là hình có `fill`, không phải đường chỉ có `stroke`.
- **Đổi chữ theo trạng thái**: chồng các `<text>` cùng chỗ, mỗi cái một trạng thái, cho màu từng cái chuyển giữa `transparent` và màu thật (hàm `state` làm sẵn).
- **Liên kết chuyển trang** không có thuộc tính URL: đích là **giá trị của tag**. Tag phải chứa `#/<at-location>`, do desktop app ghi lúc khởi động (khai báo trong `LINKS` của `model.js`). Tag chưa có giá trị thì chưa bấm được.
- **Chuyển động**: web chỉ bật/tắt hoạt hình CSS mà SVG đã có sẵn (khai báo `infinite paused`); tag = 1 thì chạy.
- `<style>` trong SVG có hiệu lực cả trang: class và keyframes mang tiền tố riêng (`es-`).
- SVG có `viewBox`, không đặt `width`/`height`; web kéo rộng 100 % cột và có nút toàn màn hình.
- Tag Bad: số vẫn hiện giá trị cuối, trạng thái giữ nguyên. Muốn sơ đồ phản ánh mất kết nối thì gắn tag trạng thái của driver (ví dụ `#Status`) vào một nhãn trạng thái.

## Thư viện vẽ `svglib`

```js
const M = require('./model');
const { Svg, C, grid } = require('./lib/svglib')(M.C);     // C = bảng màu của project
const sym = require('./lib/symbols')(M.C);

function stationSvg() {
  const W = 1600, H = 676;                                  // khung vẽ đặt theo nội dung, không buộc 16:9
  const s = new Svg(W, H);
  s.header('PUMP STATION 1', 'Overview');
  s.tiles([['TOTAL FLOW', 'TXT_Flow', 'Station.Flow', 'm3/h'], ['PRESSURE', 'TXT_Pres', 'Station.Pressure', 'bar']]);
  const cells = grid(3, { x: 24, y: 80, w: W - 48, h: 532 }, { cols: 3, gap: 16 });   // 3 khung lấp đầy vùng thân
  PUMPS.forEach((p, i) => {
    const c = cells[i], y = s.panel(c.x, c.y, c.w, c.h, p.name.toUpperCase());
    sym.pump(s, `SYM_${p.id}`, c.x + 60, y + 50, 28, { state: `${p.id}.State` });
    s.state(`ST_${p.id}`, `${p.id}.State`, c.x + 110, y + 56);
    s.kv(c.x + 20, y + 130, 'Current', `TXT_${p.id}_I`, `${p.id}.Current`, 'A', c.x + c.w - 60);
    s.hit(`LINK_${p.id}`, `${p.id}.Link`, c.x, c.y, c.w, c.h);                        // vùng bấm, đặt SAU CÙNG
  });
  return s;
}
```

| Lệnh | Vẽ gì | Gắn tag thế nào |
|---|---|---|
| `header(tiêuĐề, dòngPhụ)` | thanh tiêu đề cao 64 | không |
| `tiles([[nhãn, id, tag, đơnVị], ...])` | dãy chỉ số tổng, canh phải trên thanh tiêu đề | nội dung = giá trị tag |
| `panel(x, y, w, h, tiêuĐề)` | khung phẳng có thanh tên; trả về y bắt đầu nội dung | không |
| `num(id, tag, x, y, cỡ, màu)` | chữ hiện số, canh phải; `màu` bỏ trống là màu chữ trung tính, hoặc `C.Q('power')` để theo phong cách | nội dung = giá trị tag |
| `kv(x, y, nhãn, id, tag, đơnVị, xSố)` | một dòng "nhãn ... số đơn vị" | như `num` |
| `state(id, tag, x, y, [nhãn0, nhãn1, nhãn2])` | ô vuông màu + chữ trạng thái, tag 0/1/2 | màu và chữ theo trạng thái |
| `state2(id, tag, x, y, [tắt, bật])` | như trên cho tag 0/1 | |
| `bar(id, tag, x, y, w, h, max, màu, ngưỡngVàng)` | thanh ngang tỉ lệ `giá trị / max`, xám, chuyển vàng khi vượt ngưỡng | |
| `vbar(id, tag, x, y, w, h, max, màu)` | thanh đứng (mức bồn) | |
| `warn(id, tag, tagThấp, tagCao, x, y)` | tam giác cảnh báo, chìm khi bình thường | đỏ và nhấp nháy khi giá trị ngoài hai tag ngưỡng |
| `line('x1,y1 x2,y2 ...', {tag, id, color, width})` | đường ống / dây dẫn | có `tag` thì nét đứt chạy khi tag = 1; không thì tĩnh |
| `hit(id, tag, x, y, w, h)` | vùng bấm trong suốt, hiện viền khi rê chuột | chuyển tới trang ghi trong tag |
| `navBtn(id, tag, x, y, w, nhãn)` | nút điều hướng | như `hit` |
| `legend(xPhải, y, [[màu, nhãn], ...])` | chú giải màu, canh phải | không |
| `text`, `a(svgThô)` | phần tĩnh | không |
| `color`, `play`, `flow`, `alarm`, `link`, `control`, `cut`, `val` | (phần tử tự vẽ) | liên kết thô cho phần tử mang id đã đăng ký bằng `s.id('...')` |

`grid(n, {x, y, w, h}, {cols, gap})` trả về `n` ô bằng nhau lấp đầy vùng cho trước. Dùng nó cho mọi dãy khung lặp lại, thay cho kích thước cố định; đổi số thiết bị thì bố cục vẫn kín.

Phần tử tự vẽ có liên kết: đăng ký id trước rồi dùng lại chuỗi trả về, ví dụ
`const lamp = s.id('LAMP_1'); s.color(lamp, 'Line1.Ready', b2(C.off, C.run)); s.a(\`<circle id="${lamp}" cx="80" cy="40" r="8" fill="${C.off}"/>\`);`

## Ký hiệu thiết bị `symbols`

Mỗi ký hiệu vẽ quanh tâm `(cx, cy)` với cỡ `r`. Tuỳ chọn chung: `state` (tag 0 dừng / 1 chạy / 2 sự cố) hoặc `on` (tag 0/1) quyết định màu tô; `label` là tên thiết bị dưới ký hiệu; `run` (tag 0/1) thêm dấu quay chậm cho bơm và quạt, chỉ dùng khi thật cần.

| Hàm | Ký hiệu |
|---|---|
| `pump`, `motor`, `fan`, `compressor` | hình tròn có dấu đặc trưng (tam giác, chữ M, cánh, hai nét hội tụ) |
| `valve` (`vertical: true` cho van trên ống đứng) | nơ bướm; `on` = mở |
| `breaker` | ô vuông; `on` = đóng |
| `transformer` | hai vòng tròn lồng |
| `source` | mũi tên nguồn vào |
| `busbar(s, x1, x2, y, nhãn)` | thanh cái |
| `meter(s, id, cx, cy, r, 'P')` | điểm đo: vòng tròn có chữ (P, T, F, L, kW...) |
| `tank(s, id, x, y, w, h, {level, max, low, high})` | bồn có thanh mức bên trong, vàng khi ngoài `low`..`high` |
| `conveyor`, `exchanger` | băng tải, bộ trao đổi nhiệt |
| `unit(s, id, x, y, w, h, 'TÊN', {state})` | khối chữ nhật có tên, cho thiết bị không có ký hiệu chuẩn |

Thiết bị chưa có trong bảng: thêm hàm vào `symbols.js` theo cùng cách (một hình nền có id nhận màu trạng thái, nét viền màu chữ, chỉ dùng hình cơ bản). Nối các ký hiệu bằng `s.line(...)` đi ngang/dọc, vuông góc, không chéo.

## Hình máy và nhà máy minh hoạ `art` (phong cách `illustrated`)

Khi người dùng muốn nhìn thấy máy chạy, nhà xưởng, toàn cảnh:

```js
const art = require('./lib/art')(M.C);
// hình máy: vừa khung 300 x 150, phóng to/thu nhỏ bằng scale
s.a(`<g transform="translate(${x},${y}) scale(1.3)">${art.machineArt(s, 'press', 'P1', 'Press1.State', 'Press1.Run')}</g>`);
// toàn cảnh: khối nhà và bồn dạng phối cảnh
const I = art.iso(284, 300, 0.62);                       // gốc toạ độ trên khung vẽ và tỉ lệ
s.a(I.box(0, 0, 260, 180, 80, '#38bdf8'));               // nhà: x, y, rộng, sâu, cao, màu
s.a(I.cyl(360, 280, 44, 100, '#22d3ee'));                // bồn: tâm x, y, bán kính, cao, màu
```

- `machineArt(svg, loại, tiềnTốId, tagTrạngThái, tagChạy)`: loại là `inject`, `blow`, `crusher`, `chiller`, `cnc`, `press`, `weld`, `paint`, `print`, `cut`, `glue`, `pack`. Thân máy đổi màu theo tag trạng thái (0/1/2), bộ phận chuyển động khi tag chạy = 1. `tiềnTốId` khác nhau cho từng máy trong cùng sơ đồ.
- Máy loại khác: thêm một `case` vào `machineArt` theo đúng cách các hình có sẵn. `ACC(...)` là phần thân đổi màu; `A(class, style, hình)` là bộ phận chuyển động với class `es-spin` (quay), `es-sx` / `es-sy` (trượt ngang/dọc, khoảng cách `--d`), `es-swing` (lắc, góc `--r`, `--r2`), `es-move` (chạy một chiều rồi lặp, `--dx`, `--dy`), `es-rise` (bốc lên); `F(điểm, màu)` là nét đứt chạy. Chỉnh tốc độ bằng `animation-duration`, lệch pha bằng `animation-delay` âm.
- Khối phối cảnh: `I.box`, `I.cyl`, `I.poly(danhSáchĐiểm, độCao)` cho chi tiết trên mái và mặt sân, `I.P(x, y, z)` đổi toạ độ để đặt nhãn. `box(..., { topId })` đặt id cho mặt mái để tô màu theo trạng thái xưởng. Vẽ từ sau ra trước.
- Hình và số liệu tách nhau: hình nằm trong khung, số nằm ở vùng bên dưới hoặc bên cạnh, cả khung là vùng bấm.

Quy tắc dùng và mức kiềm chế: `references/design.md`, mục "Riêng cho illustrated".

## Chuỗi màu theo giá trị

Dạng `k1-c1,k2-c2,...` với khoá là số nguyên không âm. Giá trị nhỏ hơn khoá đầu lấy màu đầu; từ khoá này tới khoá sau lấy màu của khoá sau; lớn hơn khoá cuối lấy màu cuối. Màu viết hex `#rrggbb`, tên màu hoặc `transparent` (không dùng `rgb(...)`; không chứa dấu `-`).

| Trường hợp | Chuỗi | Hàm |
|---|---|---|
| tag 0/1 | `1-<tắt>,2-<bật>` | `b2(tắt, bật)` |
| tag 0/1/2 (dừng/chạy/sự cố) | `1-<dừng>,1-<chạy>,2-<sự cố>` | `st3(dừng, chạy, sựCố)` |
| dải tương tự | `10-<c1>,40-<c2>,80-<c3>` | viết tay |
| ẩn/hiện | `transparent` cho trạng thái ẩn | `T` |

Thanh mức (`bar`, `vbar`, `tank`) dùng dạng khác: `<ngưỡngThấp>-<màuThấp>,<màuGiữa>,<ngưỡngCao>-<màuCao>`. Đặt `max` lớn hơn giá trị lớn nhất có thể, vì phần tô không bị chặn ở mép khung.

## Bấm để điều khiển

`s.control(id, tag, 'Switch')`: bấm vào hình để đảo tag 0/1. `s.control(id, tag, 'Analog')`: bấm hiện ô nhập số rồi ghi xuống tag. Loại này có trong mã nguồn web nhưng chưa có mẫu chạy thật: báo người dùng thử trên trình duyệt. Điều khiển chắc chắn hơn là dùng công tắc, thanh trượt, ô nhập đặt ngay dưới sơ đồ.

## Xem thử bằng ảnh

`node tools/preview.js` render mọi sơ đồ; `node tools/preview.js overview` chỉ một cái. Ảnh và trang HTML nằm trong `svg\preview\`. Số liệu là số giả theo tên tag; muốn ảnh sát thực tế thì khai báo và export `PREVIEW_VALUES` trong `model.js` (`{ 'Meter1.Power_P': 86.4, State: 1 }`). Cần Edge hoặc Chrome; đặt biến môi trường `PREVIEW_BROWSER` nếu trình duyệt cài ở chỗ khác.

Soát trên ảnh, theo đúng thứ tự này:

1. **Khoảng trống**: có mảng nền nào trống rộng hơn một khung không? Có thì thu khung vẽ lại hoặc cho các khung giãn ra.
2. **Cân đối**: lề trái = lề phải, khoảng cách giữa các khung bằng nhau, các khung cùng hàng cùng chiều cao, nội dung trong khung không dồn về một phía.
3. **Thẳng hàng**: số canh thẳng cột, nhãn cùng mép trái, đơn vị không dính số khi số dài nhất.
4. **Chồng lấn**: không chữ nào đè nhau hay tràn khung.
5. **Màu**: đúng phong cách đã chọn. Với phong cách SCADA, trạng thái bình thường gần như chỉ có xám và chữ; màu nổi chỉ xuất hiện ở trạng thái và cảnh báo.

## Dung lượng

SVG nằm nguyên trong file cấu hình và được tải mỗi lần mở trang. Sơ đồ vẽ bằng thư viện này khoảng 10-40 KB. Hình vẽ bằng Inkscape thường nặng gấp nhiều lần vì metadata và đường cong thừa: dọn bớt nếu người dùng đồng ý.
