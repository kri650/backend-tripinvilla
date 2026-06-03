async function run() {
  try {
    const r = await fetch('http://localhost:8000/api/master/destinations');
    const txt = await r.text();
    console.log("Status:", r.status);
    console.log("Body:", txt);
  } catch (e) {
    console.error(e);
  }
}
run();
