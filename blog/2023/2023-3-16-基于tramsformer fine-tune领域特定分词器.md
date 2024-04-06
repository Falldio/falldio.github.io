---
title: 基于Transformer fine-tune领域特定分词器
date: 2023-3-16
author: Falldio
location: 武汉
layout: blog
tags: 
    - NLP
    - Python
summary: 归纳使用HanLP训练基于Transformer的tokenizer的过程，写着写着发现开始介绍虚拟环境了😅
---

## Before you read

### 本文的主要内容

+ 基于[Hanlp 2.x Python API](https://github.com/hankcs/HanLP)搭建某一领域特定的分词器。
  
  + 搭建Python虚拟开发环境。
  
  + 准备少量标注数据集。
  
  + 利用HanLP的transformer tokenizer对bert-base-chinese进行fine-tune。
  
  + 模型的保存和使用方式。

### 本文将不包括

**Note**: 本文将只把深度学习部分当作一个黑箱模型使用，如果你仍然想要对自然语言处理有更多的了解，下面是一些**科普性质**的资料。如果需要更深层次的理解，可能需要通过网课、教科书和论文等手段了。

+ 神经网络的基本概念介绍，粗略的介绍可见👇：
  
  + [【官方双语】深度学习之神经网络的结构 Part 1 ver 2.0_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1bx411M7Zx/?spm_id_from=333.999.0.0)
  
  + [【官方双语】深度学习之梯度下降法 Part 2 ver 0.9 beta_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1Ux411j7ri/?spm_id_from=333.999.0.0)
  
  + [【官方双语】深度学习之反向传播算法 上/下 Part 3 ver 0.9 beta_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV16x411V7Qg/?spm_id_from=333.999.0.0&vd_source=158fcb5e91ac0542b6f2ceb3b5d19d20)

+ 自然语言处理的基础方法：
  
  + 如果你倾向于传统的基于规则（或者语法）的语义分析手段，而对如今NLP中基于统计的方法存有疑虑，可参见[数学之美（第三版） (豆瓣) (douban.com)](https://book.douban.com/subject/35033507/)中的有关章节，322和图书馆都有这本书。
  
  + 如果你很难理解NLP中词向量或者词嵌入的概念，[这篇博士论文](https://arxiv.org/abs/1611.05962)或许能够帮到你。作者本人的[博客](http://licstar.net/)也有不少词向量生成和语言模型相关的文章。

+ Transformer的论文精读：
  
  + [Transformer论文逐段精读【论文精读】_哔哩哔哩_bilibili](https://www.bilibili.com/video/BV1pu411o7BE/?spm_id_from=333.337.search-card.all.click&vd_source=158fcb5e91ac0542b6f2ceb3b5d19d20)（这个视频帮了我很多）
  
  + [[1706.03762] Attention Is All You Need (arxiv.org)](https://arxiv.org/abs/1706.03762)（论文原文）

## 开发环境搭建

> 这一节内容讲解Python开发环境搭建和虚拟环境设置，是一个很傻瓜🤓的教程。这一节的安装配置利用到了Annaconda，如果本机已经有了Python环境的话，直接跳过即可。


### 安装Annaconda

> 长话短说，[Anaconda](https://www.anaconda.com/)是一个Python和R语言的发行版本，我们这里主要使用其中的[Conda](https://docs.conda.io/en/latest/)来进行Python的版本管理、环境管理和包管理。其优势在于你不需要自行管理Python的虚拟环境和Python版本，省去了不少麻烦（*想象一下你需要自行管理本机的Python 2.x 和Python 3.x环境，在运行对Python版本要求不同的软件时，你可能需要手动设置Python有关的环境变量，这也太麻烦了😡*）

Annaconda的安装包可以直接在官网获取，如果因为国内网络环境安装太慢，可以在[清华大学的镜像仓库](https://repo.anaconda.com/archive/)下载。

如果你的系统恰巧是MacOS或Linux，而且下载的是shell脚本（.sh文件），你可能需要用类似于`chmod`的命令改变文件权限。

关于具体的文件安装，如果是可执行文件，直接运行即可，如果是shell脚本，命令行直接运行更加方便。

#### 安装过程中的一些必要设置

对于Windows，你需要注意在安装时设置将Anaconda的路径加入环境变量`$PATH`中，这样才能确保后面直接在shell使用Conda命令。

#### 安装后的一些必要设置

为了保证日后下载包的速度，不妨将清华大学的镜像仓库加入conda设置中：

```sh
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge/
```

#### 安装后的确认

当你安装完成后，打开shell，应该已经能发现一些不同：你的当前命令前出现了`(base)`字样，这意味着现在我们处于一个名为base的**虚拟环境**。*虚拟环境的概念我们下一小节会简单介绍*。

如前所述，Anaconda是一个Python和R语言的发行版本，在安装过程中它会：

1. 自动安装一个Python作为其默认的Python版本。
2. 自动安装Conda作为包管理工具（*包管理工具这一概念我相信你已经很熟悉了，因此不赘言它的概念和好处。如果你还不熟悉的话，可以查看一些包管理器的官网，它们的介绍页面应该有更严谨翔实的说法，比如Python的[pip](https://pypi.org/project/pip/)、NodeJS的[npm](https://www.npmjs.com/)、[yarn](https://www.yarnpkg.cn/)，MacOS的[homebrew](https://brew.sh/)，Windows的[winget](https://learn.microsoft.com/zh-cn/windows/package-manager/winget/)、[chocolatey](https://chocolatey.org/)和[scoop](https://scoop.sh/)等*）。
3. 自动创建一个名为base的Python虚拟环境，作为其默认的Python虚拟环境。

### HanLP的配置

#### 搭建虚拟环境

> Again，虚拟环境只是一个建议，它不是必选项。如果你在未来会比较频繁的进行Python开发，你迟早需要接触这个概念。节约时间的话完全可以跳过。

既然我们已经有了conda和Python，想必安装HanLP之类的依赖对你来说已经不是难题了。但是为了依赖安全考虑，我们需要搭建一个新的虚拟环境，我们将在这个虚拟环境里运行我们的分词器项目。在本文档的例子里，我将这个环境命名为`tok`。

```sh
conda create -n tok
```

![](/Users/liucheng/Desktop/截屏2023-03-16 19.17.55.png)

如果我们按照提示切换到`tok`环境：

```sh
conda activate tok
```

则命令前方的`base`将变为`tok`。

#### 为什么需要虚拟环境？

> 现在我们已经有了两个虚拟环境了，`base`和`tok`，我们总算可以更实际地介绍什么是虚拟环境，以及为什么要使用虚拟环境了🎉。这小节内容完全是和教程无关的，你也可以直接跳过～

虚拟环境有点像是虚拟机的概念，它隔离的是Python的包和Python本身，也就是说，每个虚拟环境会独立存放一个Python包的版本，也会单独指定一个Python版本（sure，Python是不会重复安装的，虚拟环境里会单独设置python的环境变量）。

我们下面用两个例子来说明为什么虚拟环境是必要的：

1. 我们在`base`下面需要用Python2，而`tok`下需要Python3，你应该知道这两个大版本的Python是**语法不兼容**的，但却会使用**同一个环境变量**。如果没有虚拟环境，每次我们可能都要额外指定：运行a脚本要用Python2，运行b程序需要用Python3。如果是用虚拟环境加以区分，则省去了指定Python版本的麻烦，只要在虚拟环境之间切换就可以了。
2. 我们在两个虚拟环境下需要使用**版本不同的同一个包**，如果不使用虚拟环境，包的冲突是无法避免的。而有了虚拟环境，在两个环境里面我们可以使用不同的版本，两个项目会相安无事。此外，如果我们在虚拟环境里配置项目，一旦我们想要使用类似于`pip freeze > requirements.txt`的方式导出该项目的包依赖（在写开源软件的时候这通常是必要的），我们就能确保导出的只是这个项目的包依赖，不会带上别的东西。

#### 安装Python、HanLP等

万事俱备，我们可以简单使用conda安装一个Python（如下面示例，这个Python版本可以任意指定），然后用这个Python的pip工具安装HanLP。HanLP相关的依赖有很多，而这些会被pip自动安装到当前的`tok`虚拟环境中，全然不用担心这些依赖日后和其他项目发生冲突，也不必担心日后安装了更高版本的相关依赖导致HanLP无法运行，只要做好虚拟环境隔离就可以～

```sh
conda install python=3.10
pip install hanlp
```

## 训练领域特定分词器

 > 我们在这一节开始真正利用HanLP训练分词器。在文档开始已经提到，下面并不会介绍深层次的原理，我们这里只简单的把transformer当作黑箱，投进去一些标注好的数据，使其能够发现规律，完成更多的分词任务即可。
  
 需要注意的是，我们要利用的transformer API实际上包含一个已经进行过预训练的[bert-base-chinese](https://huggingface.co/bert-base-chinese)模型，这个模型已经利用通用的中文语料库训练过。问题在于，通用的语料库可能不能很好的涵盖特定领域的语料，或者特定领域语料的数量太少，在预训练时可能已经被当作噪声处理了。因此，我们实际上是在经过通用语料库预训练模型的基础上进行**fine-tune**。
 
 这里的**fine-tune**是深度学习领域的一个术语，翻译过来大概是“微调”的意思，它指的是我们已经有了一个经过大量数据训练的模型（比如我们的bert-base-chinese），我们的需求（特定领域的分词）和这个大模型原本要解决的问题有了**些许**差异，此时我们可以保留该模型的初始权重，利用**领域特定的数据集**接着训练模型，使其能更好的满足我们特定领域的需求（从广而不精到领域专家）。
 
 > *你可能会好奇这里的bert-base-chinese和transformer模型的关系是什么。实际上bert是transformer的一个变体，它们在transformer的部分实际上没什么大的区别。bert的全称是Bidirectional Encoder Representation from Transformers，如果你想看原论文，详细了解两者区别的话，可以点击👉[这里](https://arxiv.org/abs/1810.04805)。顺带一提，时下大火的GPT模型（Generative Pre-trained Transformer）也源自transformer。如今Google被Microsoft联合OpenAI ChatGPT推出的New Bing降维打击，这一切的根源居然是Google自己提出的Transformer，实在是很有戏剧性。*
 
### 数据集的准备

我们的训练数据集遵照HanLP，大概是这样的模式：

```
莫干山高新区	通航产业园	鼎盛路	28	号	3	号楼
永平路	与	长虹东街	交叉路口	往	北	约	150	米
浙江省	湖州市	德清县	舞阳街道	山民村	9	-	1	号	白果树
武康镇	贵和街	194	号
浙江省	湖州市	德清县	钟管镇	南湖社区	南湖路	272	号
```

如果你要解决的不是分词问题，你需要查看HanLP的其他用例。

### 模型训练与保存

模型训练与保存的代码大概如下所示，如果需要了解每个参数意义的话，你需要参考文档最开始所说的资料研究，但是如果只是用来训练一个简单的分词器，你完全可以使用默认参数，只需要给出训练集、测试集、模型保存路径即可。

```python
tokenizer = TransformerTaggingTokenizer()
save_dir = 'your model save path'

tokenizer.fit(
    your dataset,
    your dataset,  # Conventionally, no devset is used. See Tian et al. (2020).
    save_dir,
    'bert-base-chinese',
    max_seq_len=300,
    char_level=True,
    hard_constraint=True,
    sampler_builder=SortingSamplerBuilder(batch_size=32),
    epochs=3,
    adam_epsilon=1e-6,
    warmup_steps=0.1,
    weight_decay=0.01,
    word_dropout=0.1,
    seed=1660853059,
)
tokenizer.evaluate(your test set, save_dir)
```

模型训练完成之后会自动保存在`save_dir`下，保存结果会是多个文件，包含模型结构、权重信息等。

### 加载和使用已保存的模型

HanLP API的调用没什么好说的，这里的`print`函数会以`list`的形式输出分词结果。

```python
model = hanlp.load(save_dir)
print(model("湖北省武汉市珞瑜路129号"))
```

## What to do next?

如果顺利的话，你现在应该已经得到了一个领域特定的分词器，我想你可能有两件想做的事情🤔，但是这已经不是本文档的覆盖范围了，因此我简单给出一些建议：

+ 训练其他模型以应对更多别的需求：
	+  你可以参考[HanLP的文档](https://hanlp.hankcs.com/docs/tutorial.html)，进一步了解HanLP的应用。
	+  或者你已经不满足于既定的模型结构，想要自行设计模型，你可以参考下面的资料：
		+ [PyTorch](https://pytorch.org/)、[Tensorflow](https://tensorflow.google.cn/?hl=zh-cn)、[paddlepaddle](https://www.paddlepaddle.org.cn/)等深度学习框架。
		+ [keras](https://keras.io/zh/)等更高级的深度学习库，它们通常会自行封装一些layer供你使用，让你可以直接像搭积木一样构建模型。
+ 了解模型如何部署到实际项目里：
	+ 你可能需要参考PyTorch的模型部署文档，因为HanLP对Transformer的封装实际上是基于PyTorch实现的。
	+ 你可能需要参考Python或者其他后端编程语言搭建网络服务器的方式将模型封装成服务。
  