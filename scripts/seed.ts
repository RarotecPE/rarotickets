/**
 * Script de seed — popula o banco com dados fictícios para teste.
 *
 * Uso:
 *   npm run db:seed
 *
 * Pré-requisitos: DATABASE_URL configurada e migrations aplicadas.
 */
import "dotenv/config";
import postgres from "postgres";
import crypto from "node:crypto";

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/rarotickets";

const sql = postgres(DATABASE_URL, { max: 1 });

const uuid = () => crypto.randomUUID();
const codeReg = (year: number) =>
  `INS-${year}-${Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32))).join("")}`;
const certCode = () =>
  Array.from({ length: 10 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789".charAt(Math.floor(Math.random() * 32))).join("");

function daysFromNow(days: number, h = 9): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(h, 0, 0, 0);
  return d;
}

function genCredential(code: string): { token: string; qr: string } {
  const token = crypto.randomBytes(16).toString("hex");
  return { token, qr: `RAROTICKETS:${code}:${token}` };
}

async function main() {
  console.log("🌱 Iniciando seed...");

  await sql`BEGIN`;
  try {
    // Limpa na ordem correta (respeita FKs)
    await sql`TRUNCATE TABLE payment_webhooks, audit_logs, certificates, check_ins, payments, registrations, coupons, lots, participants, events, users RESTART IDENTITY CASCADE`;

    // ------------------------------------------------------------------
    // Usuário admin mock
    // ------------------------------------------------------------------
    const adminId = uuid();
    await sql`
      INSERT INTO users (id, global_id, name, email, role)
      VALUES (${adminId}, 'mock-admin-id', 'Administrador (Mock)', 'admin@rarotickets.local', 'ADMINISTRADOR')
    `;

    // ------------------------------------------------------------------
    // Eventos
    // ------------------------------------------------------------------
    const eventOpenId = uuid();
    const eventFutureId = uuid();
    const eventFreeId = uuid();
    const eventPastId = uuid();

    const openStart = daysFromNow(2);
    const openEnd = daysFromNow(2, 18);
    const futureStart = daysFromNow(45);
    const futureEnd = daysFromNow(45, 18);
    const freeStart = daysFromNow(10);
    const freeEnd = daysFromNow(10, 13);
    const pastStart = daysFromNow(-30, 9);
    const pastEnd = daysFromNow(-30, 18);

    await sql`
      INSERT INTO events
        (id,title,description,modality,financial_type,status,starts_at,ends_at,capacity,address,city,state,manager_id,certificate_enabled,certificate_hours,waitlist_enabled,published_at)
      VALUES
        (${eventOpenId},'Reforma Tributária 2026','Seminário sobre as novas regras e impactos para empresas públicas e privadas.','PRESENCIAL','PAGO','INSCRICOES_ABERTAS',${openStart},${openEnd},200,'Centro de Convenções, Av. Principal, 1000','Belo Horizonte','MG','mock-admin-id',true,8,true,now()),
        (${eventFutureId},'Congresso Raro de Tecnologia','Congresso anual de tecnologia e inovação.','ONLINE','PAGO','AGENDADO',${futureStart},${futureEnd},500,null,null,null,'mock-admin-id',false,null,true,now()),
        (${eventFreeId},'Workshop LGPD na Prática','Workshop gratuito sobre adequação à LGPD.','PRESENCIAL','GRATUITO','INSCRICOES_ABERTAS',${freeStart},${freeEnd},80,'Rua das Flores, 123','São Paulo','SP','mock-admin-id',true,4,true,now()),
        (${eventPastId},'Treinamento de Lideranças','Treinamento interno de lideranças (evento passado para certificados).','PRESENCIAL','PAGO','FINALIZADO',${pastStart},${pastEnd},30,'Sede Rarotec','Rio de Janeiro','RJ','mock-admin-id',true,6,false,now())
    `;

    // ------------------------------------------------------------------
    // Lotes
    // ------------------------------------------------------------------
    const lot1Open = uuid();
    const lot2Open = uuid();
    const lotEarlyFuture = uuid();
    const lot1Past = uuid();

    const past1 = daysFromNow(-5);
    past1.setHours(0, 0, 0, 0);
    const past2 = daysFromNow(30);
    past2.setHours(23, 59, 59, 0);

    await sql`
      INSERT INTO lots (id,event_id,name,price_cents,starts_at,ends_at,total_spots,spots_taken,active) VALUES
        (${lot1Open},${eventOpenId},'1º Lote',19900,now() - interval '2 days',now() + interval '5 days',100,2,true),
        (${lot2Open},${eventOpenId},'2º Lote',29900,now() + interval '5 days',now() + interval '30 days',100,0,true),
        (${lotEarlyFuture},${eventFutureId},'Early Bird',9900,now(),now() + interval '10 days',200,0,true),
        (${lot1Past},${eventPastId},'Lote Único',14900,${past1},${past2},30,3,true)
    `;

    // ------------------------------------------------------------------
    // Cupom
    // ------------------------------------------------------------------
    const couponId = uuid();
    const couponValid = daysFromNow(60);
    await sql`
      INSERT INTO coupons (id,code,type,value,event_id,max_uses,uses,active,valid_until)
      VALUES (${couponId},'BEMVINDO20','PERCENTUAL',20,null,100,1,true,${couponValid})
    `;

    // ------------------------------------------------------------------
    // Participantes
    // ------------------------------------------------------------------
    const participant1 = uuid();
    const participant2 = uuid();
    const participant3 = uuid();
    const participant4 = uuid();
    const participant5 = uuid();

    await sql`
      INSERT INTO participants
        (id,name,email,document_kind,document_value,phone,company,role)
      VALUES
        (${participant1},'Ana Souza','ana.souza@example.com','CPF','12345678909','31999990001','Prefeitura BH','Analista'),
        (${participant2},'Bruno Lima','bruno.lima@example.com','CPF','98765432100','21988887777','Ministério Público','Assessor'),
        (${participant3},'Carla Mendes','carla.mendes@example.com','CPF','11122233344','11977776666','Rarotec','Gerente'),
        (${participant4},'Diego Rocha','diego.rocha@example.com','CPF','55566677788','31955554444',null,null),
        (${participant5},'Elena Fischer','elena.f@example.com','PASSAPORTE','AB1234567','11933332222','Universidade','Pesquisadora')
    `;

    // ------------------------------------------------------------------
    // Inscrições
    // ------------------------------------------------------------------
    const regConfPaid = uuid();
    const regPending = uuid();
    const regWaitlist = uuid();
    const regConfFree = uuid();
    const regPast = uuid();

    const credConfPaid = genCredential(codeReg(new Date().getFullYear()));
    const credFree = genCredential(codeReg(new Date().getFullYear()));
    const credPast = genCredential(codeReg(new Date().getFullYear()));

    await sql`
      INSERT INTO registrations
        (id,code,event_id,participant_id,lot_id,status,contracted_price_cents,discount_amount_cents,final_price_cents,coupon_id,answers,consent_terms,consent_marketing,reservation_expires_at,confirmed_at,credential_token,credential_qr_payload)
      VALUES
        (${regConfPaid},${codeReg(new Date().getFullYear())},${eventOpenId},${participant1},${lot1Open},'CONFIRMADA',19900,0,19900,null,'[]',true,true,null,now(),${credConfPaid.token},${credConfPaid.qr}),
        (${regPending},${codeReg(new Date().getFullYear())},${eventOpenId},${participant2},${lot1Open},'AGUARDANDO_PAGAMENTO',19900,3980,15920,${couponId},'[]',true,true,now() + interval '15 minutes',null,null,null),
        (${regWaitlist},${codeReg(new Date().getFullYear())},${eventOpenId},${participant5},null,'LISTA_ESPERA',0,0,0,null,'[]',true,true,null,null,null,null),
        (${regConfFree},${codeReg(new Date().getFullYear())},${eventFreeId},${participant3},null,'CONFIRMADA',0,0,0,null,'[]',true,true,null,now(),${credFree.token},${credFree.qr}),
        (${regPast},${codeReg(new Date().getFullYear())},${eventPastId},${participant4},${lot1Past},'CONFIRMADA',14900,0,14900,null,'[]',true,true,null,${pastStart},${credPast.token},${credPast.qr})
    `;

    // ------------------------------------------------------------------
    // Pagamentos
    // ------------------------------------------------------------------
    const payPaid = uuid();
    const payPending = uuid();
    const payPast = uuid();
    await sql`
      INSERT INTO payments
        (id,registration_id,external_reference,gateway_order_id,amount_cents,status,method,payload_raw,paid_at)
      VALUES
        (${payPaid},${regConfPaid},${regConfPaid},'mock-order-1',19900,'PAGO','PIX','{"mock":true}',now()),
        (${payPending},${regPending},${regPending},'mock-order-2',15920,'AGUARDANDO',null,'{"mock":true}',null),
        (${payPast},${regPast},${regPast},'mock-order-3',14900,'PAGO','CARTAO','{"mock":true}',${pastStart})
    `;

    // ------------------------------------------------------------------
    // Check-ins e certificados para o evento passado
    // ------------------------------------------------------------------
    const checkinPast = uuid();
    await sql`
      INSERT INTO check_ins (id,registration_id,event_id,status,checked_in_at,operator_id,operator_name)
      VALUES (${checkinPast},${regPast},${eventPastId},'REALIZADO',${pastStart},'mock-admin-id','Administrador (Mock)')
    `;

    const certPast = uuid();
    await sql`
      INSERT INTO certificates (id,registration_id,event_id,participant_name,event_title,hours,code,issued_at)
      VALUES (${certPast},${regPast},${eventPastId},'Diego Rocha','Treinamento de Lideranças',6,${certCode()},now())
    `;

    // ------------------------------------------------------------------
    // Auditoria inicial
    // ------------------------------------------------------------------
    await sql`
      INSERT INTO audit_logs (id,user_id,user_email,action,entity,entity_id,new_state)
      VALUES (${uuid()},'seed','system','db.seed','System','all','seeded')
    `;

    await sql`COMMIT`;
    console.log("✅ Seed concluído com sucesso!");
    console.log("");
    console.log("🔑 Credenciais mock do RaroNexus:");
    console.log("   Ao acessar /login e clicar em 'Entrar com RaroNexus' você entrará como:");
    console.log("   • Administrador (Mock) <admin@rarotickets.local>");
    console.log("");
    console.log("📊 Eventos criados:");
    console.log("   • Reforma Tributária 2026 (inscrições abertas, pago)");
    console.log("   • Congresso Raro de Tecnologia (agendado, pago)");
    console.log("   • Workshop LGPD na Prática (inscrições abertas, gratuito)");
    console.log("   • Treinamento de Lideranças (finalizado, com certificado emitido)");
    console.log("");
    console.log("🎟️ Cupom de desconto: BEMVINDO20 (20% OFF)");
    console.log("");
  } catch (err) {
    await sql`ROLLBACK`;
    console.error("❌ Erro durante o seed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
