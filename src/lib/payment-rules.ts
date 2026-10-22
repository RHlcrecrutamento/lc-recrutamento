/** Demonstração nunca é aceita em produção nem quando há token do gateway. */
export function localDemoAllowed(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_PAYMENTS === 'true' && !process.env.MP_ACCESS_TOKEN;
}
export function validUnlockSql(alias='u'): string {
  return `${alias}.revoked_at IS NULL AND (${alias}.expires_at IS NULL OR ${alias}.expires_at > datetime('now')) AND EXISTS (SELECT 1 FROM orders paid_order WHERE paid_order.id=${alias}.order_id AND paid_order.status='aprovado' AND paid_order.gateway_payment_id IS NOT NULL AND ((paid_order.gateway='mercadopago' AND paid_order.gateway_environment='${process.env.MP_ENVIRONMENT==='test'?'test':'production'}')${localDemoAllowed()?" OR paid_order.gateway='demo'":''}))`;
}
