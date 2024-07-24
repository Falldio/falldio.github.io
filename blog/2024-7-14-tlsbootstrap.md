---
title: 如何实现kube-apiserver与kubelet的安全通信？
date: 2024-7-14
author: Falldio
location: 深圳
layout: blog
tags: 
    - k8s
    - Kubeadm
    - 网络
    - 分布式系统
    - Go
    - Problem Solving
summary: 在Kubernetes的默认设置中，kube-apiserver访问kubelet的过程并未加密，这意味着期间可能发生中间人攻击。从我个人的学习经历来看，Kubernetes的文档虽然大而全，但是刚上手的人很难从中获取如何解决细节问题的方案，所以我把自己的探索过程记录下来。
---

这其实是工作中的一个安全基线问题，抛开业务逻辑来看，表面的问题是：`kubectl logs`和`kubectl exec`在启用了`kubelet-certificate-authority`参数后无法正常使用，显示证书无法校验。

要达成的目标是：Kubeadm初始化的k8s集群如何确保TLS Bootstrap？

PKI（Public Key Infrastructure）指代的是k8s集群进行TLS加密通信的一系列证书。
在我们的场景中，使用kubectl向pod发送指令失败，期间的网络通路如下：

```
kubectl -> kube-apiserver -> kubelet -> container
```

我们的报错信息大概是：

```
cannot validate certificate for <worker_node_ip> because it doesn't contain any IP SANs
```

这意味着kubectl和kube-apiserver能够正常通信，返回后续通路的错误，问题在于`kube-apiserver -> kubelet`的安全证书无法正常校验。这就很不符合常识，因为Kubeadm会为我们生成TLS通信所需的各项证书，简直是傻瓜式的操作，不太可能出现这种低级错误。

继续查询资料可以发现，Kubelet的证书实际上分client和server两种，我们这里出现问题的serving证书默认是自签名，但我们设置的`kubelet-certificate-authority`指向kube-apiserver处的ca。
所以接下来我们需要处理让kube-apiserver给kubelet签名。

首先，在kubelet的配置中需要设置`serverTLSBootstrap`标志，使之能够向ca发送CSR（certificate signing request）。

接下来就是相对tricky的部分了，出于[安全考虑](https://github.com/kubernetes/community/pull/1982)，k8s移除了serving证书CSR的自动批准功能，我们需要在满足安全要求的前提下设计自己的方案。

通过`kubectl approve`手动批准CSR的方式肯定行不通，因为我们的目标是自动化组建集群。

网上流传有开源的[csr-approver](https://github.com/postfinance/kubelet-csr-approver)项目，从CSR类型、IP段等方面限制了能够自动批准的CSR种类，以保证安全性。

另一种方案是利用`go-client`手写控制器，监听CSR资源，对符合要求的CSR进行批准操作。最后考虑到项目的代码结构，我在`kubeadm init`和`kubeadm join`操作后，业务功能安装完成前的时间段使用自定义controller的方式完成了CSR的批准。

## Further Reading

1. [PKI certificates and requirements](https://kubernetes.io/docs/setup/best-practices/certificates/)
2. [Certificate Management with kubeadm](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/)
3. [Enabling signed kubelet serving certificates](https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/#kubelet-serving-certs)
4. [TLS bootstrapping](https://kubernetes.io/docs/reference/access-authn-authz/kubelet-tls-bootstrapping/)