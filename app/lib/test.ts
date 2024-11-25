const getPayload = (r) => {
  const a = decodeURIComponent(r);

  const b = a.split("&");

  const c = b.map((s) => {
    const i = s.indexOf("=");
    const key = s.slice(0, i);
    const value = s.slice(i + 1);

    try {
      const parsed = JSON.parse(value);

      if (parsed) {
        return [key, parsed];
      }
    } catch (e) {}

    return [key, value];
  });

  const d = Object.fromEntries(c);

  return d;
};
