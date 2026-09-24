import { formatDateSystem } from "../routes/v1/components/tools/date_tools.js";
import { hmac } from "../routes/v1/components/tools/encrypt_tools.js";

export async function seed(knex) {

  const uniqueId = "USR000000";
  const username = "superadmin@admin.com";
  const fullname = "Superadmin";
  const telp = "08100000000";
  const role = "superadmin";
  const password = "Superadmin321!";
  const status = "1";

  // Generate password sesuai logika di kode asli
  const cPassword = process.env.USER_KEY + uniqueId + password;

  const dDatetimeIso = formatDateSystem();
  const secret = process.env.USER_SECRET;
  const hashedPassword = hmac(cPassword, secret, 'sha512');

  const oData = {
    user_code: uniqueId,
    username: username,
    fullname: fullname,
    telp: telp,
    role: role,
    status: status,
    password: hashedPassword,
    tz: "UTC",
    created_at: dDatetimeIso,
    updated_at: dDatetimeIso,
  };

  await knex("user_credential").insert(oData);
};