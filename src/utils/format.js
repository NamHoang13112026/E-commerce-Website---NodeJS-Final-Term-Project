// 75299000 -> "75,299,000đ"
function formatPrice(n) {
  return new Intl.NumberFormat('en-US').format(Number(n) || 0) + 'đ';
}

// 4.3 -> HTML of 5 Bootstrap star icons (full / half / empty)
function stars(avg) {
  const v = Math.round((Number(avg) || 0) * 2) / 2;
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(v)) html += '<i class="bi bi-star-fill"></i>';
    else if (i - 0.5 === v) html += '<i class="bi bi-star-half"></i>';
    else html += '<i class="bi bi-star"></i>';
  }
  return html;
}

module.exports = { formatPrice, stars };
