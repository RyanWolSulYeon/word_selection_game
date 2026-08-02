# Bắt Chữ — Trò chơi chọn nghĩa từ tiếng Anh

Trang web tĩnh (HTML/CSS/JS thuần, không cần build), sẵn sàng triển khai lên GitHub Pages.

## Tính năng
- **Soạn câu hỏi**: nhập từ cần hỏi + nhiều đáp án, chọn 1 đáp án đúng.
- **Sửa / xóa** câu hỏi đã lưu, **xuất/nhập JSON** để sao lưu hoặc chia sẻ bộ câu hỏi.
- **Chơi**: từ hiển thị phía trên, các đáp án trôi nổi ngẫu nhiên (lên/xuống/qua lại, nảy trong khung) phía dưới.
  - Chạm đúng → hiệu ứng âm thanh vui + khóa màn, chuyển câu tiếp theo.
  - Chạm sai → hiệu ứng âm thanh báo sai + rung nhẹ, được thử lại đến khi chọn đúng.
- Dữ liệu câu hỏi lưu trong `localStorage` của trình duyệt (không cần server/database).

## Cách chạy thử trên máy
Mở trực tiếp file `index.html` bằng trình duyệt, hoặc chạy một server tĩnh đơn giản:
```
python3 -m http.server 8000
```
rồi truy cập `http://localhost:8000`.

## Triển khai lên GitHub Pages
1. Tạo một repository mới trên GitHub (ví dụ `catch-word-game`).
2. Đưa 3 file `index.html`, `style.css`, `script.js` (và README này nếu muốn) vào repo, commit và push lên nhánh `main`.
3. Vào **Settings → Pages** của repository.
4. Ở mục **Build and deployment**, chọn **Source: Deploy from a branch**.
5. Chọn **Branch: main**, thư mục **/ (root)**, rồi bấm **Save**.
6. Sau khoảng 1 phút, trang sẽ có tại:
   `https://<ten-tai-khoan>.github.io/<ten-repo>/`

## Lưu ý
- Vì dữ liệu lưu ở `localStorage`, mỗi trình duyệt/máy sẽ có bộ câu hỏi riêng. Dùng nút **Xuất JSON** ở tab Soạn câu hỏi để sao lưu, và **Nhập JSON** để nạp lại hoặc chia sẻ cho người khác.
- Không cần tải file âm thanh — hiệu ứng đúng/sai được tạo trực tiếp bằng Web Audio API.
