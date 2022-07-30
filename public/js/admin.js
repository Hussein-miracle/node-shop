const deleteProduct = (btn) => {
  const productId = btn.parentNode.querySelector('[name=productId]').value;
  const csrf = btn.parentNode.querySelector('[name=_csrf]').value;

  const el = btn.closest('article');


  fetch(`/admin/product/${productId}`,{
    method: "DELETE",
    headers: {
      'csrf-token':csrf,
    }  ,
  }).then((value) => {
    return value.json();
  })
  .then((value) => {
    console.log(value);
    el.parentNode.removeChild(el);
  })
  .catch((err) => {
    console.log(err);
  })
}