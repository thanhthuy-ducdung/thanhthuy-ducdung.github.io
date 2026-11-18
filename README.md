# Thiệp cưới Thanh Thúy & Đức Dũng

Trang web tĩnh (HTML, CSS, JS thuần), không cần build, không cần máy chủ.

## Sửa nội dung

Mọi thông tin nằm trong `config.js` (tên, cha mẹ, ngày giờ, địa điểm, ảnh, số tài khoản). Để `""` thì thiệp hiện dòng trống.

- Ngày cưới: `date: "2026-12-20"`, giờ: `time: "11:00"`, đón khách: `arrival: "10:30"`.
- Ảnh: bỏ file vào `assets/album/web/` rồi ghi vào `album.photos`, ví dụ `["assets/album/web/01.jpg"]`. Ảnh cặp đôi ở `couple.photo`.
- Khi chưa có ảnh, thiệp hiện khung trống.

## Đưa lên mạng (GitHub Pages, miễn phí)

1. Tạo repo trên GitHub (chế độ **Public**), đẩy toàn bộ thư mục này lên nhánh `main`.
2. Vào repo: **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, thư mục `/ (root)`. Lưu lại.
3. Sau 1–2 phút trang chạy tại `https://<tên-github>.github.io/<tên-repo>/`.

## Gắn tên miền riêng

1. Mua tên miền, vào phần quản lý DNS của nhà cung cấp, thêm:
   - Tên miền gốc (ví dụ `thiepcuoi.vn`): bốn bản ghi **A** trỏ tới `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`.
   - Tên miền phụ `www`: một bản ghi **CNAME** trỏ tới `<tên-github>.github.io`.
2. Trong repo, tạo file `CNAME` (không có đuôi) ở thư mục gốc, nội dung chỉ một dòng là tên miền, ví dụ `thiepcuoi.vn`. Hoặc nhập tên miền ở **Settings → Pages → Custom domain**.
3. Chờ DNS cập nhật (vài phút đến vài giờ), rồi tích **Enforce HTTPS** ở trang Pages.

Mọi đường dẫn trong trang là đường dẫn tương đối nên chạy được cả ở địa chỉ `github.io/<repo>/` lẫn tên miền riêng.

## Xem link xem trước (Zalo, Facebook)

Khi đã có tên miền, mở `index.html` và thêm vào `<head>`:

```html
<meta property="og:url" content="https://tên-miền-của-bạn/">
<meta property="og:image" content="https://tên-miền-của-bạn/assets/album/web/01.jpg">
```

## Nhận lời chúc và xác nhận tham dự

Hiện `sheetEndpoint` trong `config.js` để trống, nên lời chúc và xác nhận chỉ lưu trong trình duyệt của người điền, **không ai nhận được**. Cần nối với Google Sheet (Apps Script) hoặc dịch vụ nhận form trước khi gửi thiệp cho khách.

## Gửi thiệp riêng cho từng khách

Thêm `?to=Tên khách` sau địa chỉ, ví dụ `https://tên-miền/?to=Anh%20Nam`, trên bìa sẽ hiện "Trân trọng kính mời Anh Nam". Thêm `?side=groom` hoặc `?side=bride` để mở sẵn phần nhà trai hoặc nhà gái.
