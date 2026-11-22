// Trả về danh sách số trang để hiển thị, ví dụ [1, 2, 3, '…', 10]
function pageList(page, total) {
  // Luôn giữ trang đầu, trang cuối, trang hiện tại và 2 trang kề bên
  const set = new Set([1, total, page - 1, page, page + 1]);
  const nums = [...set].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i) {
      const gap = n - nums[i - 1];
      if (gap === 2) out.push(n - 1);      // chỉ thiếu 1 trang: hiện luôn số đó
      else if (gap > 2) out.push('…');     // thiếu nhiều trang: hiện dấu ba chấm
    }
    out.push(n);
  });
  return out;
}

module.exports = { pageList };