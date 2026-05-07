
    %% ── 发起支付 ──
    用户/前端->>后端: 1. POST /api/pay<br/>{ goods_name, money, user_id }

    后端->>后端: 2. 生成唯一 out_trade_no（订单号）
    后端->>数据库: 3. INSERT orders<br/>{ out_trade_no, amount, status: 'pending' }
    数据库-->>后端: 插入成功

    后端->>后端: 4. 拼接参数 + Zpay 密钥<br/>MD5/SHA256 签名 → sign
    后端-->>用户/前端: 5. 返回支付跳转 URL<br/>https://zpay.xxx?pid=&money=&sign=...

    %% ── 用户支付 ──
    用户/前端->>Zpay支付平台: 6. 浏览器跳转到支付页面
    Note over Zpay支付平台: 用户选择支付方式<br/>完成付款

    %% ── 异步回调（核心） ──
    Zpay支付平台->>后端: 7. 异步 POST /api/pay/notify<br/>{ out_trade_no, trade_no, money, sign, ... }

    后端->>后端: 8. 验证签名是否合法<br/>（防止伪造回调）
    后端->>数据库: 9. 查询 out_trade_no 对应订单<br/>校验金额是否一致

    alt 签名合法 & 金额正确
        后端->>数据库: 10. UPDATE orders SET status='paid'<br/>trade_no = Zpay流水号
        数据库-->>后端: 更新成功
        后端-->>Zpay支付平台: 返回字符串 "success"（必须）
    else 验证失败
        后端-->>Zpay支付平台: 返回 "fail"<br/>（Zpay 会重试回调）
    end

    %% ── 前端同步跳转 ──
    Zpay支付平台-->>用户/前端: 11. 同步跳转 return_url<br/>（仅用于页面展示，不可信）
    用户/前端->>后端: 12. 查询订单状态<br/>GET /api/order/:out_trade_no
    后端->>数据库: SELECT status FROM orders
    数据库-->>后端: status = 'paid'
    后端-->>用户/前端: 13. 返回支付成功，渲染结果页