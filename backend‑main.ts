import { serve } from "https://deno.land/std@0.212.0/http/server.ts";
import { kv } from "https://deno.land/x/kv_tool@v1.0.0/mod.ts";

// =========配置区=========
const ADMIN_PASSWORD = "78h57xc910mn70z1c38i"; // ✅一定要改成你自己密码
const CORS_ORIGIN = "*";
// ========================

type ResourceItem = {
  id:string;
  title:string;
  desc:string;
  link:string;
  size:string;
  downloadCount:number;
}

async function handler(req:Request):Promise<Response>{
  const url = new URL(req.url);
  const path = url.pathname;

  const headers = new Headers();
  headers.set("Access‑Control‑Allow‑Origin",CORS_ORIGIN);
  headers.set("Access‑Control‑Allow‑Methods","GET,POST,DELETE,OPTIONS");
  headers.set("Access‑Control‑Allow‑Headers","Content‑Type,X‑Admin‑Token");

  if(req.method === "OPTIONS"){
    return new Response(null,{headers});
  }

  // 获取全部资源列表（给前端首页调用）
  if(path === "/api/list"){
    const resList:ResourceItem[] = [];
    for await(const entry of kv.list({prefix:["resource"]})){
      resList.push(entry.value as ResourceItem);
    }
    return Response.json(resList,{headers});
  }

  // 下载接口：计数+1，跳转到夸克网盘
  if(path === "/api/download"){
    const rid = url.searchParams.get("id");
    if(!rid) return new Response("缺少id参数",{status:400,headers});
    const item = await kv.get<ResourceItem>(["resource",rid]);
    if(!item.value) return new Response("资源不存在",{status:404,headers});
    item.value.downloadCount +=1;
    await kv.set(["resource",rid],item.value);
    return Response.redirect(item.value.link,302);
  }

  //管理员密码校验
  if(path === "/api/admin/auth"){
    const body = await req.json();
    return Response.json({ok:body.password === ADMIN_PASSWORD},{headers});
  }

  //保存/新增资源
  if(path === "/api/admin/save"){
    const token = req.headers.get("X‑Admin‑Token");
    if(token !== ADMIN_PASSWORD) return new Response("权限不足",{status:403,headers});
    const body = await req.json() as ResourceItem;
    if(!body.id) body.id = crypto.randomUUID();
    await kv.set(["resource",body.id],body);
    return Response.json({ok:true,id:body.id},{headers});
  }

  //删除资源
  if(path === "/api/admin/del"){
    const token = req.headers.get("X‑Admin‑Token");
    if(token !== ADMIN_PASSWORD) return new Response("权限不足",{status:403,headers});
    const rid = url.searchParams.get("id");
    await kv.delete(["resource",rid!]);
    return Response.json({ok:true},{headers});
  }

  return new Response("✅API后端服务运行正常",{status:200,headers});
}

serve(handler);

