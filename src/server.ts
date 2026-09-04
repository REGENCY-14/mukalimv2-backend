import app from "./app";

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`MUKALIM API listening on port ${PORT}`);
});
