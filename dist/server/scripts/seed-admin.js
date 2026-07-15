"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const zod_1 = require("zod");
const db_1 = require("../src/server/db");
const security_1 = require("../src/server/security");
const input = zod_1.z.object({ ADMIN_EMAIL: zod_1.z.string().email(), ADMIN_PASSWORD: zod_1.z.string().min(14) }).parse(process.env);
async function main() {
    const userId = (0, node_crypto_1.randomUUID)();
    const orgId = (0, node_crypto_1.randomUUID)();
    await (0, db_1.transaction)(async (connection) => {
        await connection.execute("INSERT IGNORE INTO organizations (id,name,slug,plan_code,monthly_page_limit) VALUES (?,'Future OCR Operations','future-ocr-operations','internal',10000000)", [orgId]);
        const [existing] = await connection.query('SELECT id FROM users WHERE email=?', [input.ADMIN_EMAIL.toLowerCase()]);
        const actualUser = existing[0]?.id ?? userId;
        if (!existing[0])
            await connection.execute("INSERT INTO users (id,email,password_hash,name,system_role) VALUES (?,?,?,'System Administrator','admin')", [userId, input.ADMIN_EMAIL.toLowerCase(), await (0, security_1.hashPassword)(input.ADMIN_PASSWORD)]);
        else
            await connection.execute("UPDATE users SET system_role='admin' WHERE id=?", [actualUser]);
        await connection.execute("INSERT IGNORE INTO memberships (organization_id,user_id,role) VALUES (?,?,'owner')", [orgId, actualUser]);
    });
    console.log(-{ïO=¶‰ËkºwµçYËËœİ]\ËËœ[—ØÛÙKË›[ÛWÜYÙWÛ[Z]Ë˜Ü™X]YØ]ÓÕS•
TÕSÕK\Ù\—ÚY
HY[X™\œËÓÕS•
TÕSÕ‹šY
H›ØœÈ”“ÓHÜ™Ø[š^˜][ÛœÈÈQ•“ÒSˆY[X™\œÚ\ÈHÓˆK›Ü™Ø[š^˜][Û—ÚY[ËšYQ•“ÒSˆØÜ—Ú›ØœÈˆÓˆ‹›Ü™Ø[š^˜][Û—ÚY[ËšYÔ“ÕT–HËšYÔ‘Tˆ–HË˜Ü™X]YØ]TĞÈSRUŒ
NÜ™\ËšœÛÛŠÛÜ™Ø[š^˜][ÛœßJ_JNÂœ›İ]\‹œ]Ú
	ËÛÜ™Ø[š^˜][ÛœËÎšY	Ë\Ş[˜Ê™\K™\ÊOOØÛÛœİ]]J™\H\È]][XØ]Y™\]Y\İ
K˜]]ØÛÛœİ\œÙY^‹›Øš™Xİ
Üİ]\Î‹™[[JÉØXİ]™IË	Üİ\Ü[™Y	×JK›Ü[Û˜[

K[ÛÙN‹œİš[™Ê
K›Z[ŠŠK›X^

K›Ü[Û˜[

K[ÛTYÙS[Z]‹›[X™\Š
Kš[

K›Z[Š
K›X^
L
K›Ü[Û˜[

_JKœ™Yš[™JO“Øš™XİšÙ^\ÊŠK›[™İŒ
KœØY™T\œÙJ™\K˜›ÙJNÚYŠ\\œÙYœİXØÙ\ÜÊ\™]\›ˆ™\Ëœİ]\Ê
KšœÛÛŠÙ\œ›ÜØÛÙN‰ÕSQUSÓ—ÑT”“Ô‰ËY\ÜØYÙN‰Ó›È˜[YÜ™Ø[š^˜][ÛˆÚ[™Ù\Èİ\YY	ß_JNØÛÛœİšY[Îœİš[™Ö×OV×NØÛÛœİ˜[Y\Î˜[V×OV×NÚYŠ\œÙY™]Kœİ]\Ê^ÙšY[Ëœ\Ú
	Üİ]\ÏOÉÊNİ˜[Y\Ëœ\Ú
\œÙY™]Kœİ]\Ê_ZYŠ\œÙY™]Kœ[ÛÙJ^ÙšY[Ëœ\Ú
	Ü[—ØÛÙOOÉÊNİ˜[Y\Ëœ\Ú
\œÙY™]Kœ[ÛÙJ_ZYŠ\œÙY™]K›[ÛTYÙS[Z]OO][™Yš[™Y
^ÙšY[Ëœ\Ú
	Û[ÛWÜYÙWÛ[Z]OÉÊNİ˜[Y\Ëœ\Ú
\œÙY™]K›[ÛTYÙS[Z]
_]˜[Y\Ëœ\Ú
™\Kœ\˜[\ËšY
NØ]ØZ]‹™^Xİ]JTUHÜ™Ø[š^˜][ÛœÈÑU	ÙšY[Ëš›Ú[Š	Ë	Ê_HÒT‘HYOØ˜[Y\ÊNØ]ØZ]]Y]
ØXİÜ•\Ù\’Y˜]]\Ù\’YXİ[Û‰ÛÜ™Ø[š^˜][Û‹\]Y	Ë\™Ù]\N‰ÛÜ™Ø[š^˜][Û‰Ë\™Ù]Yœ™\Kœ\˜[\ËšY\œ™\Kš\Y]Y]Nœ\œÙY™]_JNÜ™\ËšœÛÛŠİ\]YY_J_JNÂœ›İ]\‹™Ù]
	ËØ]Y]	Ë\Ş[˜ÊÜ™\K™\ÊOOØÛÛœİ]™[ÏX]ØZ]›İÜÏ[V×OŠ	ÔÑSPÕYÜ™Ø[š^˜][Û—ÚYXİÜ—İ\Ù\—ÚYXİ[Û‹\™Ù]İ\K\™Ù]ÚY\ØY™\ÜËÜ™X]YØ]”“ÓH]Y]Ù]™[ÈÔ‘Tˆ–HÜ™X]YØ]TĞÈSRUŒ	ÊNÜ™\ËšœÛÛŠÙ]™[ßJ_JNÂ™^ÜY˜][›İ]\Â