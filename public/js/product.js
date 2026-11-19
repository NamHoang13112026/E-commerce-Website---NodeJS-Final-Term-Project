// Product detail page: image gallery + variant selection (price and stock update without reload)
(function () {
  var fmt = function (n) { return new Intl.NumberFormat('en-US').format(n) + 'đ'; };

  // Gallery
  var main = document.getElementById('main-image');
  document.querySelectorAll('.thumb').forEach(function (btn) {
    btn.addEventListener('click', function () {
      main.src = btn.dataset.src;
      document.querySelectorAll('.thumb').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // Variants
  var box = document.getElementById('variants');
  if (!box) return;
  var variants = JSON.parse(box.dataset.variants);
  var priceEl = document.getElementById('price');
  var stockEl = document.getElementById('stock');
  var qty = document.getElementById('qty');
  var addBtn = document.getElementById('add-to-cart');

  function select(id) {
    var v = variants.find(function (x) { return String(x.id) === String(id); });
    if (!v) return;
    priceEl.textContent = fmt(v.price);
    if (v.stock > 0) {
      stockEl.innerHTML = '<span class="text-success"><i class="bi bi-check-circle"></i> Còn hàng</span> <span class="text-muted">(' + v.stock + ' sản phẩm)</span>';
    } else {
      stockEl.innerHTML = '<span class="text-danger"><i class="bi bi-x-circle"></i> Hết hàng</span>';
    }
    qty.max = Math.max(v.stock, 1);
    if (Number(qty.value) > v.stock) qty.value = Math.max(v.stock, 1);
    qty.disabled = addBtn.disabled = v.stock === 0;
    addBtn.dataset.variantId = v.id;
  }

  box.addEventListener('change', function (e) { if (e.target.name === 'variant') select(e.target.value); });
  var checked = box.querySelector('input:checked');
  if (checked) select(checked.value);
})();
