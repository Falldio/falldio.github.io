---
title: Jounery to the Net
date: 2023-7-16
author: Falldio
location: 武汉
layout: blog
tags: 
    - 网络
    - C
    - Unix
summary: DHCP、DNS、HTTP、TLS/SSL、TCP、UDP、ICMP、IP、ARP，blahblahblah... 本文将归纳计算机从联网到接收数据过程中所涉及的主要流程。我会把这篇文章当作计算机网络的大纲使用，但要建立一个完整的计算机网络知识体系，还需要阅读更深刻的资料。
---

一个经典的面试题目是：当你在浏览器中输入一个网址，按下回车键后，发生了什么🤔

本文会在该问题的基础上更进一步，讨论个人设备是如何联网的，在那之后如何发送请求，并接收服务器数据，以及，具体到Unix系统上，这些数据是如何被应用程序接收的。

TL; DR🥹

## DHCP —— 动态主机配置协议

既然要发送Web请求，那么我们的设备首先需要知道自己是谁，也即知道自己的`IP地址`（我们会在后面更详细的介绍IP协议，这里只需要明白它能够标识这台计算机即可）。不论设备是通过有线还是无线方式连接到一个子网络，`IP地址`都是由`DHCP`（[Dynamic Host Configuration Protocol](https://learn.microsoft.com/en-us/windows-server/networking/technologies/dhcp/dhcp-top)）协议分配的。

典型的网络中通常有一个`DHCP`服务器，负责为子网络中新加入的设备分配`IP地址`、`子网掩码`、`网关`、`DNS服务器`等信息。这些信息对设备访问网络都是必须的，某种意义上可以把`DHCP`服务器理解成RPG游戏中的新手引导NPC，它告诉你网络世界中的基本玩法。

更严肃地来说，`DHCP`服务器由网络管理员预先配置，其中存放着如下信息：

+ `TCP/IP`配置信息：`IP地址`、`子网掩码`、`网关`、`DNS服务器`等。
+ 有效`IP地址池`：`DHCP`服务器会从这个池中分配`IP地址`给新加入的设备。
+ 为特定设备预留的`IP地址`：管理员可以确保某些设备总是能够获得相同的`IP地址`，这对于一些需要固定`IP地址`的设备（如打印机）是必要的。
+ 租约（lease）：`DHCP`服务器会为每个分配的`IP地址`设置一个租约，租约到期后，`DHCP`服务器会收回该`IP地址`，并重新分配给其他设备。

当一个设备新近接入网络，它将首先向本地的`DHCP`服务器请求如下数据：

+ `IP地址`：`DHCP`服务器会从`IP地址池`中分配一个`IP地址`给新加入的设备。
+ 一些额外的配置信息，比如默认网关（`Default Gateway`）、`DNS服务器`地址等。

`DHCP`服务器的优势在于设备配置的**自动化**，设想一下，如果一个子网络没有`DHCP`服务器，那么每个设备都需要手动配置`IP地址`、`子网掩码`、`网关`、`DNS服务器`等信息，而且，如果网络管理员需要更改某些配置信息，那么他需要逐一访问每台设备，这无疑是一件非常低效的事情。以Windows 11为例，我们可以在设置界面找到`DHCP`服务的相关信息：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307162051368.png)

如果没有`DHCP`服务器，那么我们需要手动配置`IP地址`、`子网掩码`、`网关`、`DNS服务器`等信息。It just sucks!

现在我们仔细观察一下`DHCP`服务器分配`IP地址`的过程：

### DHCP服务器发现

当刚加入子网时，我们的设备是不知道`DHCP`服务器在哪里的，其首要任务就是通过IP广播机制发现一个能够与之交互的`DHCP`服务器。设备会通过`UDP`协议，向67端口（即`DHCP`服务器的默认端口）发送一个广播包（`DHCPDISCOVER`）。其`IP`数据报的目的地址为255.255.255.255，源地址为0.0.0.0。该数据报到达链路层时，其目的地址为`FF:FF:FF:FF:FF:FF`，源地址为设备自身的`MAC`地址，这样，所有与子网连接的节点都能收到该数据报，这其中必然包括`DHCP`服务器。

> 到目前为止文中已经出现了许多还不曾介绍的概念，比如`UDP`、`IP`数据报、`MAC`地址等，如果读者初次接触计算机网络，可能会感到有些吃力。不过，不用担心，我们会在详细介绍这些概念，请尽管带着疑惑读下去，读到后面相关内容再回看，就会豁然开朗😊。

### DHCP服务器提供

当`DHCP`服务器收到`DHCPDISCOVER`数据报后，它会向设备发送一个`DHCPOFFER`数据报，其中前文提到的配置信息，即这个`DHCP`服务器计划给新设备分配的配置信息。该数据报的目的地址仍为广播地址255.255.255.255，源地址则为`DHCP`服务器的`IP地址`。**采用广播地址是因为此刻新设备仍然没有`IP地址`，无法与`DHCP`服务器进行单播通信**。但是既然之前新设备已经向`DHCP`服务器发送过广播包，那么它的`MAC`地址已经被`DHCP`服务器记录下来，因此`DHCP`服务器可以将`DHCPOFFER`数据报的目的地址设置为新设备的`MAC`地址，这样新设备就能够收到该数据报了。

### DHCP服务器请求

设备收到`DHCPOFFER`数据报后，会向`DHCP`服务器发送一个`DHCPREQUEST`数据报，作为响应，即告知`DHCP`服务器，我接受你的配置信息，你可以将这些信息分配给我。这个数据报中将回显`DHCPOFFER`的数据。

如果有多个`DHCP`服务器同时收到了`DHCPDISCOVER`数据报，那么它们都会向新设备发送`DHCPOFFER`数据报，（一个子网中配置多个`DHCP`服务器并不新鲜）。但是新设备只会选择其中的一个服务器发送请求。

### DHCP服务器确认

指定的`DHCP`服务器收到请求之后，会向新设备发送一个`DHCPACK`数据报。设备收到该数据报后，就可以使用`DHCP`服务器提供的配置信息了。如果超出了`DHCP`服务器的租约期限，那么设备需要重新向`DHCP`服务器发送请求，以续约。否则，`DHCP`服务器会收回该`IP地址`，并重新分配给其他设备。

下面是一个`DHCP`服务器分配`IP地址`的过程的示意图，原图参见《计算机网络：自顶向下方法》：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307162144789.png)

## DNS —— 域名系统

到目前为止，设备已经成功获取了`IP地址`，但是我们还不知道服务器的`IP地址`，因此无法建立套接字连接。我们需要一个功能，将请求的URL转换为服务器的`IP地址`，这就是`DNS`（[Domain Name System](https://learn.microsoft.com/en-us/windows-server/networking/dns/dns-top)，域名系统）要做的事情。

> `DNS`其实用于主机名和`IP地址`之间的转换，但是我们通常使用的主机名都是域名，因此，我们可以将`DNS`理解为域名系统。实际上localhost这样的主机名也是可以通过`DNS`解析的，只不过这种解析是通过`hosts`文件完成的，而不是`DNS`服务器。

`DNS`具有两点特征：

+ 由分层的`DNS`服务器组成的**分布式数据库**。
+ 使主机能够查询该分布式数据库的**应用层协议**。

### 资源记录

`DNS`服务器中存储的数据称为资源记录（resource record, `RR`），重要的`RR`类型有：

+ `A`记录：将主机名映射为32位的`IPv4`地址。
+ `AAAA`记录：将主机名映射为128位的`IPv6`地址，4倍于`A`记录，故称为`AAAA`。
+ `PTR`记录：将`IP地址`映射为主机名。
+ `MX`记录：将邮件服务器的主机名映射为`IP地址`。当存在多个`MX`记录时，它们按照优先级顺序（值越小优先级越高）使用。
+ `CNAME`记录：即规范名字（canonical name）记录，将主机名映射为另一个主机名。这个记录通常用于主机有多个别名的情况。

一个具体的`RR`示例如下：

```
www.example.com. 3600 IN A xxx.xxx.xxx.xxx

www.example.com.：主机名
3600：TTL（Time To Live），该记录在缓存中的存活时间，单位为秒，通常为2天
IN：记录类型，IN表示Internet
A：记录数据的类型，A表示`IPv4`地址
xxx.xxx.xxx.xxx：`IPv4`地址
```

### DNS服务器的层次结构

again，图来自《计算机网络：自顶向下方法》：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307171108548.png)

可想而知，`DNS`请求是相当频繁的，因此不太可能使用单一的`DNS`服务器来处理所有的`DNS`请求。`DNS`服务器的层次结构可以有效地减轻`DNS`服务器的负担，类似于OS的多级缓存。


假设我们要查询`www.example.com`的`IP地址`，那么用户将首先向**本地`DNS`服务器**发送请求，该服务器并不在这张图中，通常是由`DHCP`服务器配置的，见前文。本地`DNS`服务器将首先查看自己的缓存，如果存在请求的`RR`，则直接返回；否则，将发送**根`DNS`服务器**的`IP`地址。根服务器查询缓存，如果查不到，则注意到请求中的`com`后缀，向**本地`DNS`服务器**发送负责`com`的**顶级域`DNS`服务器**（`TLD`服务器）的`IP`地址。`TLD`服务器经历类似的缓存查询过程，如果未能击中缓存，则向**本地`DNS`服务器**发送负责`example.com`的**权威`DNS`服务器**的`IP`地址。最后，**本地`DNS`服务器**向**权威`DNS`服务器**发送请求，后者将返回`www.example.com`的`IP地址`。**本地`DNS`服务器**将该`IP地址`缓存，并将其返回给用户。

以上过程看似复杂，但由于**多级缓存机制**，大多数的查询都可以在本地`DNS`服务器中完成，根`DNS`服务器大多数时候会被绕过，因此整个过程的延迟并不高。

此外，`DNS`属于应用层协议，通常使用的是`UDP`，但如果返回的`RR`数据量太大，则会切换到`TCP`。

### 具体到网络编程...

对于客户端程序，通过主机名获取`IP地址`的过程是透明的，涉及如下几个函数：

```c
#include <netdb.h>

struct hostent *gethostbyname(const char *hostname);

struct hostent *gethostbyaddr(const void *addr, socklen_t len, int family);

int getaddrinfo(const char *hostname, const char *service, const struct addrinfo *hints, struct addrinfo **result);

struct hostent {
    char *h_name;       /* official (canonical) name of host */
    char **h_aliases;   /* alias list */
    int h_addrtype;     /* host address type: AF_INET */
    int h_length;       /* length of address: 4 */
    char **h_addr_list; /* list of addresses */
}

struct addrinfo {
    int ai_flags;           /* AI_PASSIVE, AI_CANONNAME, etc. */
    int ai_family;          /* AF_INET, AF_INET6, AF_UNSPEC */
    int ai_socktype;        /* SOCK_STREAM, SOCK_DGRAM */
    int ai_protocol;        /* use 0 for "any" */
    size_t ai_addrlen;      /* size of ai_addr in bytes */
    struct sockaddr *ai_addr;   /* struct sockaddr_in or _in6 */
    char *ai_canonname;     /* full canonical hostname */
    struct addrinfo *ai_next;   /* linked list, next node */
}
```

`gethostbyname`执行的是对`A`记录的查询，只能返回`IPv4`地址，由于目前正在向`IPv6`过渡，因此POSIX规范中预警可能在未来删除该函数，但《Unix网络编程》的作者认为除非`IPv4`被完全淘汰，否则该函数不会被删除。

`gethostbyaddr`执行的是对`PTR`记录的查询，通过一个`IPv4`或`IPv6`地址获取**主机名**。

`getaddrinfo`能够处理名字到地址和服务到端口的转换，其返回的`addrinfo`结构体可由套接字函数直接使用。

客户端的典型使用方式如下：

```c
int serve(const char *host, const char *serv) {
    int sockfd, n; // sockfd为套接字描述符，n为错误码
    struct addrinfo hints, *res, *ressave;

    bzero(&hints, sizeof(struct addrinfo));
    // 提示：IPv4或IPv6，TCP或UDP
    hints.ai_family = AF_UNSPEC;
    hints.ai_socktype = SOCK_STREAM;

    if ((n = getaddrinfo(host, serv, &hints, &res)) != 0) {
        // 找不到对应的主机名或服务名
    }

    ressave = res;

    // 根据DNS返回的结果，尝试连接，可能有多个IP地址
    do {
        sockfd = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
        if (sockfd < 0) {
            // 无法创建套接字
            continue;
        }

        if (connect(sockfd, res->ai_addr, res->ai_addrlen) == 0) {
            // 连接成功
            break;
        }

        close(sockfd);
    } while ((res = res->ai_next) != NULL);

    if (res == NULL) {
        // handle this error
    }

    freeaddrinfo(ressave);

    // 返回已经连接的套接字描述符，供后续使用
    return sockfd;
}
```

## HTTPS —— 加密通信

经过`DNS`解析，我们的设备已经知道了目标网址的服务器`IP`地址，所以可以建立连接进行通信了。`HTTP`即[HyperText Transfer Protocol](https://www.cloudflare.com/zh-cn/learning/ddos/glossary/hypertext-transfer-protocol-http/)，超文本传输协议，是一种基于**请求/响应**模型的应用层协议。换句话说，设备通过`HTTP`协议向服务器发送请求，向服务器索取想要的资源，服务器在收到请求之后响应。

> 实际上`HTTP`只是诸多应用层协议的一种，除此之外还有`FTP`、`SMTP`、`POP3`、`RPC`等等，它们分别适用于不同的场景。但`HTTP`适用于普通用户浏览网页的大多数场景。

### 一个HTTP实例

当我们访问某个网页，我们会在浏览器的Console里看到类似如下的信息：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307171405048.png)

而这实际上就是一个`HTTP`请求报文，当然，浏览器会将其格式化显示，但实际上它就是一段文本，其标头原始的样子如下：

```http
GET / HTTP/1.1
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7
Accept-Encoding: gzip, deflate, br
Accept-Language: zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6
Cache-Control: max-age=0
Connection: keep-alive
Cookie: BIDUPSID=4FAF620E4C2370D62A83ACCA42A8B52A; PSTM=1678887990; MCITY=-218%3A; BAIDUID=4FAF620E4C2370D60AE2EE214C40F2FE:SL=0:NR=10:FG=1; BDUSS=ldEVlNBcmRUZnRmc0FENklQNHNSTm1yTEVpaUpseDBaakN1M0ZIQmxwYkU4V1JrSVFBQUFBJCQAAAAAAAAAAAEAAACusmI1u9TSubXE0v68sgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMRkPWTEZD1kU; BDUSS_BFESS=ldEVlNBcmRUZnRmc0FENklQNHNSTm1yTEVpaUpseDBaakN1M0ZIQmxwYkU4V1JrSVFBQUFBJCQAAAAAAAAAAAEAAACusmI1u9TSubXE0v68sgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMRkPWTEZD1kU; sug=3; sugstore=1; ORIGIN=2; bdime=0; BAIDUID_BFESS=4FAF620E4C2370D60AE2EE214C40F2FE:SL=0:NR=10:FG=1; ZFY=Sqb:AWsQsOPw4bH:BqiZ1xv6DafDnFWahML:Bfc6MLQvlc:C; baikeVisitId=aa5cae05-89eb-4aed-85e8-13572559a6cd; COOKIE_SESSION=15_1_6_8_8_10_0_0_6_6_36_3_206_0_1_0_1688307324_1688307086_1688307323%7C9%23932_10_1688307109%7C4; RT="z=1&dm=baidu.com&si=49b5704e-f548-4fc2-b6cd-f44d1c28999a&ss=lk57eeil&sl=4&tt=2yf&bcn=https%3A%2F%2Ffclog.baidu.com%2Flog%2Fweirwood%3Ftype%3Dperf&ld=drw&ul=j0o&hd=j0r"; BD_HOME=1; H_PS_PSSID=36550_38643_38831_39027_39022_38943_38958_38954_38973_38814_39088_26350_39042_39093_39100_38682; BD_UPN=12314753; BA_HECTOR=0ha420al210k0k2124202g261ib9med1p
Host: www.baidu.com
Sec-Fetch-Dest: document
Sec-Fetch-Mode: navigate
Sec-Fetch-Site: none
Sec-Fetch-User: ?1
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.82
sec-ch-ua: "Not.A/Brand";v="8", "Chromium";v="114", "Microsoft Edge";v="114"
sec-ch-ua-mobile: ?0
sec-ch-ua-platform: "Windows"
```

而针对这个请求，服务器返回的响应标头如下：

```http
HTTP/1.1 200 OK
Bdpagetype: 2
Bdqid: 0xc05efb2a000b0a3b
Connection: keep-alive
Content-Encoding: gzip
Content-Security-Policy: frame-ancestors 'self' https://chat.baidu.com http://mirror-chat.baidu.com https://fj-chat.baidu.com https://hba-chat.baidu.com https://hbe-chat.baidu.com https://njjs-chat.baidu.com https://nj-chat.baidu.com https://hna-chat.baidu.com https://hnb-chat.baidu.com http://debug.baidu-int.com;
Content-Type: text/html; charset=utf-8
Date: Mon, 17 Jul 2023 06:04:01 GMT
Isprivate: 1
Server: BWS/1.1
Set-Cookie: BDSVRTM=390; path=/
Set-Cookie: BD_HOME=1; path=/
Set-Cookie: H_PS_PSSID=36550_38643_38831_39027_39022_38943_38958_38954_38973_38814_39088_26350_39042_39093_39100_38682; path=/; domain=.baidu.com
Strict-Transport-Security: max-age=172800
Traceid: 1689573841038872321013861792860900887099
X-Ua-Compatible: IE=Edge,chrome=1
Transfer-Encoding: chunked
```

而响应的主体内容则是`baidu.com`的`html`代码。

可以看到，`HTTP`协议是一个类似于键值对的协议，每个键值对之间用`:`分隔，每个键值对之后用`\r\n`分隔，最后用一个空行`\r\n`分隔响应头和响应主体。

由于本文只是一个大纲，我们不会陷入对`HTTP`中每个键值的讨论，我们简单关注一下几个键值：

- `Host`：请求的主机名，用于**服务器上托管多个域名**的情况下，服务器根据`Host`来判断请求的是哪个域名。
- `User-Agent`：请求的客户端信息，用于服务器根据不同的客户端返回不同的内容。不同的浏览器可能在内容显示上存在差异，需要服务器返回不同的网页实现。
- `Cookie`：请求的`Cookie`，用于服务器根据`Cookie`来判断用户的身份。`HTTP`是一个**无状态**协议，而实际上许多应用需要用户的身份信息，`Cookie`是保留状态信息的一种解决方案。
- `Connection`：请求的连接类型，`keep-alive`表示请求后保持连接，`close`表示请求后关闭连接。在`HTTP/1.0`中，每次请求都会关闭连接，而在`HTTP/1.1`中，修改为默认长连接，省去了每次重新建立`TCP`连接的开销。

用白话解释一下两则报文，其实就是：

+ 客户向`www.baidu.com`发起请求，希望能够获取到`baidu.com`的网页内容，在该请求里，客户描述了自己可以接受的文件内容，自己可以接受的压缩格式，自己的身份信息等内容。
+ 服务器收到并检查请求后，返回了`baidu.com`的网页内容，同时在响应标头里描述了内容的压缩格式、文件类型等信息，并将状态码设置为`200`，表示请求成功。

`HTTP`的状态码是用来表示请求的处理结果的，状态码的第一个数字代表了响应的类型，一共有五种类型：

| 类型 | 描述                                                           |
| ---- | -------------------------------------------------------------- |
| 1xx  | 信息，服务器收到请求，需要请求者继续执行操作                   |
| 2xx  | 成功，操作被成功接收并处理                                     |
| 3xx  | 重定向，需要进一步的操作以完成请求                             |
| 4xx  | 客户端错误，请求包含语法错误或无法完成请求                     |
| 5xx  | 服务器错误，服务器在处理请求的过程中发生了错误，例如服务器崩溃 |

### 通过SSL/TLS规避安全问题

既然`HTTP`是一个明文协议，那么我们在使用`HTTP`时，就会面临着以下几个问题:

1. 传输内容可能被窃听
2. `HTTP`报文在传输过程中可能被篡改
3. 可能存在恶意的第三方冒充成客户或者服务器，在另外一方浑然不知的情况下与之进行通信

`SSL`（[Secure Sockets Layer](https://www.cloudflare.com/zh-cn/learning/ssl/what-is-ssl/)）或者`TLS`可以解决上述问题（这两个名称实际上指代的是同一个东西，这个称呼上的差异有一定历史原因）。

下面我们就从这三个问题来分别看`SSL/TLS`的解决方案：

#### 加密传输内容

`TLS`协议直接对传输内容进行加密，即使通信被截获，第三方获取的也是无意义的密文，而要破解这些密文是十分困难的。

`TLS`支持如`RSA`、`ECDHE`等多种加密算法，这些算法基本上都是两方**先通过非对称加密算法协商出一个对称加密算法的密钥，然后再通过对称加密算法进行通信**。

以`RSA`算法为例，两方协商的过程如下：

1. 客户端生成一个随机数，发送给服务器。
2. 服务器收到随机数后，自己也生成一个随机数，返回给客户端。
3. 客户端生成一个新的随机数pre-master，用服务器公钥加密后发送给服务器，同时将三个随机数拼接后作为对称加密的密钥。
4. 服务器用私钥解密，得到pre-master，同时将三个随机数拼接后作为对称加密的密钥。

`RSA`算法的缺陷在于，服务器的私钥是不变的，如果私钥泄露，则之前所有的通信都会被破解（不支持前向保密）。

针对该问题，`ECDHE`算法则是每次都生成一个新的私钥，这样即使私钥泄露，之前的通信也不会被破解（支持前向保密）：

1. 客户端生成一个随机数，发送给服务器。
2. 服务器收到随机数后，自己也生成一个随机数返回给客户端，同时选择`ECDHE`算法，选择一个椭圆曲线，并生成公钥-私钥对，将公钥发送给客户端。
3. 客户端收到随机数、椭圆曲线和公钥后，生成客户端的公钥-私钥对，将公钥发送给服务器，同时将两边生成的随机数和椭圆曲线上的基点计算，得到一个共享密钥。
4. 服务器拿到客户端的公钥，也可以计算出共享密钥。

> 这一节内容忽略了两种加密算法的数学原理讨论，你可能对椭圆曲线这个突兀的名词感到疑惑，碍于篇幅这里不再更进一步说明。这里只是为了说明`TLS`的混合加密过程，通过比较说明`ECDHE`算法在安全性上的优势。

#### 消息验证机制

我们不能阻止第三方截获通信内容，但是我们可以通过消息验证机制来保证通信内容的完整性，这样一旦通信内容被篡改，通信双方就会发现。

`TLS`通过MAC（[Message Authentification Code](https://en.wikipedia.org/wiki/Message_authentication_code)）算法来实现消息完整性验证，这是一种结合哈希函数和密钥的算法，通过将消息和密钥作为输入，生成一个消息摘要。

传统的哈希算法可以对消息生成摘要，类似于Git中的`SHA-1`，但是第三方完全可以在篡改消息之后，由篡改的消息生成新的摘要，接收消息的一方仍然认为消息是完整的。而MAC将密钥作为摘要生成算法输入的一部分，这样第三方就无法生成正确的摘要了。

#### 身份验证机制

为了避免恶意的第三方冒充服务器，`TLS`引入安全证书机制，通过数字签名来保证服务器的身份。

前面我们讨论通信加密时简单提及了`TLS`的四次握手过程，但是只关注了对称密钥协商的过程，实际上在这四次握手中同时通过数字签名验证了服务器的身份。

在第二次握手中，服务器不光返回随机数和选定的密码套件，同时会返回一个安全证书，这个证书中通常包括如下内容：

+ 服务器公钥（`ECDHE`算法中无需包含公钥）
+ 持有者信息
+ 证书认证机构（`CA`，Certificate Authority）信息
+ 证书有效期

`CA`是身份验证机制额外引入的概念，是一个**值得信任的第三方机构**，由它来签发服务器的证书。如果客户认为签发证书的`CA`是值得信任的，那么就可以认为服务器的身份是可信的，也即是一个信任链问题。

`CA`会把服务器的有关信息打包进行哈希计算（回忆一下上文中的消息验证机制），然后用自己的私钥将这个摘要加密（相比于加密整个证书，这样做的开销更小），并把加密后的摘要也放到证书中。客户端在验证证书时，首先使用同样的加密算法算出摘要，然后用`CA`的公钥解密证书中的摘要，如果两个摘要相同，那么就说明证书是可信的，即服务器值得信赖。

你可能会问，客户端从哪里拿到`CA`的公钥？实际上，`CA`的公钥是**内置在操作系统中的**，这样就可以保证客户端拿到的公钥是可信的。除此之外，`CA`本身也有一个类似于`DNS`的多级结构，如果客户端无法识别服务器的`CA`，那么就会向上级`CA`请求，直到找到一个可信的`CA`，通过前面提到的信任链问题，就可以认为服务器的身份是可信的。

## TCP/UDP —— 将数据传输到目标主机

到目前为止，我们的设备已经联网，并且可以通过`DNS`找到目标主机，同时还通过`HTTPS`确保了通信的安全性，但是我们还没有真正的发送数据，而这是通过传输层协议来实现的，更具体地说，有`TCP`([Transmission Control Protocol](https://en.wikipedia.org/wiki/Transmission_Control_Protocol))和`UDP`([User Datagram Protocol](https://en.wikipedia.org/wiki/User_Datagram_Protocol))两种协议。

> 实际上传输层协议还有`SCTP`，而且这个协议比`TCP`、`UDP`更新，但是由于`SCTP`的使用场景比较少，这里就不再讨论了。

从一个较为粗略的角度来看：

+ `TCP`是一种**面向连接**的、**可靠**的、**基于字节流**的传输层协议，它的可靠性是通过**确认**和**重传**机制来实现的。
+ `UDP`是一种**基于数据报**的传输层协议，它只提供了数据收发和校验的功能，不保证数据的可靠性。

有一个精彩的类比，`TCP`就像是电话通信服务，必须有一条连接才能建立通信，而`UDP`像是邮政服务，只需要知道对方的地址就可以发送信件，至于能否送达就要看具体情况了。

### TCP：连接、可靠、字节流

下图是`TCP`报文的结构示意，来源于维基百科：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307171625049.png)

`TCP`通过源和目标两个端口号标识一个连接，用序列号和ACK确认号来确保数据的可靠传输，用窗口大小来控制流量，用校验和来保证数据的完整性。一个`TCP`报文的最大长度被称为`MSS`（Maximum Segment Size），通常为`1460`字节，这个值是由`IP`协议的最大传输单元（`MTU`，Maximum Transmission Unit）决定的，`MTU`的值通常为`1500`字节，减去`IP`报文头的`20`字节和`TCP`报文头的`20`字节（如果没有Options），就是`1460`字节。

#### 用三握四挥管理连接

建立连接的前提是**保证通信双方都能收发数据**，`TCP`用三次握手来实现这一点，过程类似于下图：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307171648417.png)

图中的箭头代表时间顺序，左右两侧是网络编程中的函数调用。

对于服务器端，首先需要创建一个`socket`，然后调用`bind`函数绑定端口号和`IP`地址，接着调用`listen`函数监听端口（该函数将一个主动套接字转换为被动套接字），随后阻塞在`accept`函数（该函数从全连接队列的队头取出一个`socket`，如果队列为空则阻塞）。当有客户端连接时，进行三次握手。

对于客户端，只需要创建一个`socket`，然后调用`connect`函数连接服务器，连接成功就可以通过`socket`来收发数据了。

> 客户端也可以调用`bind`来指定端口号和`IP`地址，但是通常情况下，客户端的端口号是由操作系统自动分配的，而不是由程序员指定的，这么做没有意义。

三次握手的过程实际上是在客户端调用`connect`时发生的：

1. 客户端向服务器发送一个`SYN`报文，其中`SYN`标志位为`1`，`seq`字段为`x`，表示客户端的初始序列号。
2. 服务端在`accept`时收到`SYN`报文，此时将**创建一个新的`socket`**，放入半连接队列，然后向客户端发送一个`SYN`报文，其中`SYN`标志位为`1`，`seq`字段为`y`，`ACK`字段为`x+1`，表示服务端的初始序列号，`ACK`确认号为`x+1`，表示客户端的初始序列号加`1`。
3. 客户端收到`SYN, ACK`，返回一个`ACK`表示服务端的`SYN`已经收到，此时连接已经建立。
4. 服务端收到`ACK`，之前创建的`socket`转移到全连接队列，服务器从全连接队列中取出`socket`，并fork一个子进程来处理这个连接。

可以把三次握手拆解成两边各自发送`SYN`，接收对方的`ACK`的过程，这样看，如果两个客户同时发送`SYN`，也可以建立连接。

三次握手的必要性在于：

+ 保证双方都能收发数据。
+ 确保双方序列号初始化的一致性
+ 防止历史SYN错误地打开连接（如果由于网络原因，一个旧的SYN比重传的新SYN先到达，服务端可以用RST报文拒绝连接）
+ 防止资源浪费（如果没有第三次握手，服务端不得不为为每一个客户端的SYN创建一个新的socket，如果有恶意的客户端不断发送SYN，就会导致服务端资源耗尽）

网络通信过程实际上是对`socket`这个文件进行读写操作，当通信结束时（通常是客户端主动断开连接），即调用`close`或者`shutdown`函数，此时进入四次挥手：

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307172125556.png)

1. 客户端调用`close`，发送`FIN`报文，进入`FIN_WAIT_1`状态。
2. 服务器收到后，发送`ACK`，进入`CLOSE_WAIT`状态，此时可以继续向客户端发送数据。客户端收到`ACK`后，进入`FIN_WAIT_2`状态。
3. 当服务器完成剩余数据发送后，发送`FIN`报文，进入`LAST_ACK`状态。
4. 客户端收到`FIN`后，发送`ACK`，进入`TIME_WAIT`状态，**等待`2MSL`（最大报文段生存时间）后**，进入`CLOSED`状态。服务器收到`ACK`后，进入`CLOSED`状态。

四次挥手的必要性在于：

服务端需要一个将剩余数据发送完全的过程，因此其`ACK`和`FIN`必须分开发送。如果没有数据需要发送，可以合并`ACK`和`FIN`，这样就可以减少一次通信。

> 为什么客户端要等待`2MSL`（TIME_WAIT状态）？
>   + 为了保证服务器收到`ACK`，因为`ACK`可能丢失，此时服务器会重传`FIN`，如果客户端已经关闭，就会发送`RST`报文，导致服务器认为连接异常。
>   + 为了保证`TIME_WAIT`状态的客户端不会收到之前的连接请求，因为网络中可能有延迟的报文，如果客户端不等待，就会收到之前的连接请求，导致错误。

#### 用序列号和重传机制保证可靠性

`TCP`依靠序列号和重传机制来保证可靠性。一个`TCP`报文的序列号代表该报文首字节的字节流编号，并非从0开始，而是随机选择的，这样可以防止历史报文的重复发送。确认号则代表**期望收到的下一个字节的编号**，如果出于网络原因，一方收到了0-500和1000-1500的报文，那么确认号就是501，表示期望收到的下一个字节的编号是501（可以联想一下Raft中的`commitIndex`）。这种累计确认的设计可以确保响应报文中ACK号之前的报文都已经收到，因此可以减少报文的数量。

数据的发送方会通过**指数加权移动平均算法**（[Exponential Weighted Moving Average](https://en.wikipedia.org/wiki/Exponential_smoothing), EWMA）估计一个RTT（Round Trip Time，往返时间）：

$$EstimatedRTT = (1-\alpha) \times EstimatedRTT + \alpha \times SampleRTT$$

`TCP`会为传输一次的报文测量`SampleRTT`，考虑到网络波动，任何时刻的`SampleRTT`都不能代表整个网络通信过程的情况，因此使用这种移动平滑的方式来估计`RTT`。`TCP`的`alpha`通常取值为`0.125`。

除此之外，`TCP`还会测量一个偏差`DevRTT`，用于计算超时时间：

$$DevRTT = (1-\beta) \times DevRTT + \beta \times |SampleRTT - EstimatedRTT|$$

该公式用于评估`SampleRTT`和`EstimatedRTT`的偏差，`TCP`的`beta`通常取值为`0.25`。

在确定超时间隔时，数据发送方综合考虑了上述两个因素：

$$TimeoutInterval = EstimatedRTT + 4 \times DevRTT$$

当网络波动较大，即`DevRTT`较大时，超时时间会增大，从而减少重传的次数，即赋予了数据传输更大的宽容度，反之波动小时，`TCP`对超时会更严格。

只要出现超时，`TCP`便会重传数据，并将`TimeoutInterval`加倍，以此来适应网络波动，等到收到报文段，则会用上面的公式重新计算`TimeoutInterval`。

此外，如果收到3次重复的`ACK`报文段，`TCP`会立即重传数据，而不是等待超时。这种情况通常发生在网络中出现了丢包，但是后续的报文都已经到达了，因此接收方会重复发送`ACK`，以此来提醒发送方重传数据，这种机制被称为**快速重传**（Fast Retransmit）。

> 一段不知道放在哪里的细碎知识：我们回到`socket`的层面，每个`socket`都有发送和接收两个缓冲区。对于`TCP`而言，数据发送后并不能立刻从发送缓冲区中删除，而是等待接收方的`ACK`，因为发送缓冲区中的数据可能会被重传。

#### 流量控制和拥塞控制

你还应该注意到，前面`TCP`报文段的头部还有一个`Window Size`字段，该字段用于流量控制和拥塞控制，两者都是为了抑制发送方发送过量的数据。

流量控制是为了防止发送方的海量数据淹没了接收方的接收缓冲区，比如接收缓冲区大小为4字节，但是发送方一下子发送了10字节，那么多余的6字节就会被丢弃。为了避免这个问题，接收方会在`ACK`报文段中携带一个`Window Size`字段，表示自己的接收缓冲区还有多少空间，发送方本身会维持一个接收窗口（`rwnd`）变量，在整个通信过程中，接收方会在`ACK`报文段中携带自身最新的`Window Size`，而发送方会根据`rwnd`和`Window Size`来决定发送数据的数量。

> 一个特殊的情况，如果接收方的接收缓冲区已满，那么`Window Size`就会为0，此时发送方会停止发送数据。既然无法发送数据，那么发送方就不会收到`ACK`，无法得知何时能够继续发送数据，造成活锁。为了解决这个问题，`TCP`的发送方在这个情况下会发送一个特殊的报文段，称为**零窗口探测报文段**（Zero Window Probe），该报文段不携带数据，只是为了探测接收方的接收缓冲区是否已经有空间了，如果有空间，接收方会回复一个`Window Size`大于0的`ACK`报文段，从而让发送方继续发送数据。

拥塞控制则是`TCP`对整条数据链路做出的贡献，当发送方察觉网络拥塞时，会自发减少数据发送量。这是通过一个拥塞窗口（`cwnd`）实现的。网络拥塞意味着途径的路由器可能出现丢包，这将导致前面提到的超时和冗余`ACK`两种情况。

`TCP`通过以下算法调整`cwnd`：

- 慢启动（Slow Start）：初始时，`cwnd`为1，每收到一个`ACK`，`cwnd`加倍，直到达到一个**阈值（`ssthresh`）**。传输速率在这个阶段会翻倍增长。
- 拥塞避免（Congestion Avoidance）：当`cwnd`达到阈值时，每收到一个`ACK`，`cwnd`加1，传输速率线性增长。
- 快速恢复（Fast Recovery）：当出现超时或者冗余`ACK`时，`cwnd`会减半，然后进入拥塞避免阶段。

综合两种控制，`TCP`一次发送的数据量为`min(cwnd, rwnd)`。

### 但是UDP不管

前面提到的`TCP`的各种feature，`UDP`都没有，它只是一个简单的传输层协议，只负责将数据从一端传输到另一端，不保证数据的可靠性，也不保证数据的顺序。

![](https://cdn.jsdelivr.net/gh/Falldio/pics@main/img/202307172321015.png)

`UDP`的报文段头部只有固定的8字节，（`TCP`的选项字段意味着头部长度不固定），这意味着`UDP`能保证更高的效率。由于不需要建立连接，`UDP`能够实现广播和多播，而`TCP`只能实现单播。相较于`TCP`需要对长度超过`MSS`的数据进行分片，`UDP`则没有这个限制（仍然限制在`MTU`以内），因此`UDP`按照原始数据分包传递。

从网络编程的层面上看，`UDP`收发数据的接口与`TCP`是一致的，只是`UDP`不需要建立连接，因此`UDP`的`socket`不需要调用`listen`和`accept`，而是直接调用`bind`绑定端口，然后调用`recvfrom`和`sendto`收发数据。在`sento`中，`UDP`需要指定目标地址，这代表每次可以和不同的`socket`通信。

```c
int recvfrom(int sockfd, void *buf, size_t len, int flags, struct sockaddr *src_addr, socklen_t *addrlen);
int sendto(int sockfd, const void *buf, size_t len, int flags, const struct sockaddr *dest_addr, socklen_t addrlen);
```

## IP —— 点对点通信

至此，由我们设备发出的数据（要是你还记得文章开头的面试题......）已经完成了传输层的封装，接下来进入网络层。

数据在网络中的传播是通过路由转发实现的，而路由器只会根据`IP`地址，把数据从一个端口转发到另一个端口（一个典型的误区就是认为`IP`地址和主机是一对一的关系）。具体而言，每台路由器会维护一个路由表，记录着目的地址和下一跳的映射关系，当路由器收到一个数据包时，会根据目的地址，按照**最长前缀匹配**的原则，将数据包转发到下一跳，直到数据包到达目的主机。

目前流行`IPv4`和`IPv6`两个版本的`IP`协议，`IPv4`使用32位地址，`IPv6`使用128位地址，`IPv6`的地址空间更大，但是由于`IPv4`的广泛使用，`IPv6`的普及仍然比较缓慢。

```
IPv4地址：
32位二进制数，通常以点分十进制表示，如192.168.2.42

IPv6地址：
128位二进制数，通常以冒号分隔的8个16位十六进制数表示，如2001:0db8:85a3:0000:0000:8a2e:0370:7334
```

以`IPv4`为例，`IP`地址通过**子网掩码**来划分网络和主机，子网掩码是一个32位的二进制数，其中网络部分全为1，主机部分全为0。子网掩码和`IP`地址进行按位与运算，就可以得到网络地址。如192.168.2.42/24，子网掩码为24，即子网为192.168.2.0。

> 这里忽略了一种更久远的网络划分方式，即A、B、C类地址，这种方式已经不再使用。

特殊的，主机部分全为1的地址被称为**广播地址**（`255.255.255.255`则是广播域内的限制广播地址），用于向同一子网中的所有主机发送数据，回忆一下`DHCP`的过程。`0.0.0.0`是缺省地址，当路由器收到一个数据包，但是没有匹配的路由表项时，会将数据包转发到这里。`127.0.0.1`是回环地址，用于本机通信，在Windows系统里，这里的主机名是`localhost`。

## ICMP —— 互联网控制报文协议

`ICMP`([Internet Control Message Protocol](https://en.wikipedia.org/wiki/Internet_Control_Message_Protocol))是`IP`协议的一个子协议，用于在网络中传递控制信息，如路由器不可达、超时等。常用的`ping`和`traceroute`命令就是基于`ICMP`实现的。

## ARP —— 查询MAC地址

在网络层，数据包的转发是根据`IP`地址进行的，而在链路层，数据包的转发是根据`MAC`地址（[media access control address](https://en.wikipedia.org/wiki/MAC_address)，并非`TLS`数据校验中的`MAC`码）进行的。`ARP`([Address Resolution Protocol](https://en.wikipedia.org/wiki/Address_Resolution_Protocol))也是`IP`协议的一个子协议，用于查询`IP`地址对应的`MAC`地址。

主机将要转发一个`IP`数据包时，会加上以太网帧的头部，首先查询本地的`ARP`缓存，如果没有找到对应的`MAC`地址，就会发送一个`ARP`请求，**广播**到与之连接的所有设备，询问目标`IP`地址（即转发端口的`IP`地址）对应的`MAC`地址。目标主机收到`ARP`请求后，会回复一个`ARP`响应，包含自己的`MAC`地址。主机收到`ARP`响应后，会将`IP`地址和`MAC`地址的映射关系缓存起来，以便下次查询（与`DNS`有几分相似）。

在数据传输的过程中，以太网帧中的两个`MAC`地址会发生变化，而`IP`数据报中的`IP`地址则保持不变，除非使用了NAT设备。

## Summary

至此，请求数据已经完成了链路层的封装，接下来进入物理层，通过网卡发送出去，对方收到请求后，会按照相反的顺序，依次解封装，最终得到请求的数据。

我们回顾整个过程，首先设备通过`DHCP`服务拿到自己的`IP`地址和相关配置信息，再通过`DNS`服务拿到目标主机的`IP`地址。在使用`HTTP`发送协议时，首先在应用层组装`HTTP`请求，然后下降到传输层，使用`TCP`或者`UDP`协议提供数据传输服务，如果是`HTTPS`，则是先完成`TCP`三次握手，然后进行`TLS`四次握手。之后，利用`IP`协议进行数据转发，最后在链路层加上以太网帧头部，通过网卡发送出去。在整条数据链路的每一个路由器中，数据都会被解封装，然后根据`IP`地址进行转发，此时会用到`ARP`协议查询目标的`MAC`地址，确定转发的端口。最终，数据到达目标主机，按照相反的顺序，依次解封装，最终得到请求的数据。这期间如果出现差错，则会使用`ICMP`协议通知数据的发送方。

写到这里篇幅已经很长，但是实际上还有不少内容没有涉及，考虑到这只是一篇大纲，这里列出没有关注的知识点，以供后续深入学习。

1. 网络编程中的IO模型
2. 比`HTTPS`更新的应用层协议
3. `TCP`粘包问题
4. `UDP`如何实现可靠数据传输
5. `IPv4`和`IPv6`的互操作 
6. `IP`数据包的分片和重组
7. 多层的检验和机制是否冗余

......

## Further Reading

- [计算机网络：自顶向下方法](https://book.douban.com/subject/30280001/)
- [Unix网络编程 卷1：套接字联网API](https://book.douban.com/subject/26434583/)
- [图解HTTP](https://book.douban.com/subject/25863515/)
