-- Z-pay 对账与异步通知幂等：渠道流水号、首次通知时间
alter table public.orders
  add column if not exists zpay_trade_no text,
  add column if not exists payment_notified_at timestamptz;

create index if not exists orders_zpay_trade_no_idx on public.orders (zpay_trade_no)
  where zpay_trade_no is not null;
