---
title: 用动态规划计算编辑距离
date: 2023-2-26
tags:
 - 算法
 - Go
author: Falldio
location: 宜昌
summary: 利用二维DP计算两个字符串的编辑距离。
---

> 这篇文章是我对[Edit Distance](https://leetcode.com/problems/edit-distance/description/)的题解，最早发布在[LeetCode](https://leetcode.com/problems/edit-distance/solutions/3231533/golang-dynamic-programming-with-explanation/)上。编辑距离是二维DP中很经典的一类题，我想这篇文章能够很清晰地呈现填写DP表并寻找单元格关系的思路。

## Intuition
We will have to draw a table to help understand how DP works in this solution:

||empty str|r|o|s|
|:-:|:-:|:-:|:-:|:-:|
|empty str|0|1|2|3|
|h|1|1|2|3|
|o|2|2|1|2|
|r|3|2|2|2|
|s|4|3|3|2|
|e|5|4|4|**3**|

In this table, the number in the cells stands for **the minimum operation times** needed to transform from `word1` to `word2`. Note we only care about the first `n` chars when we fill the `nth` row or cols!

For example, we only care about `hor` when we are dealing with `row 'r'`.

More specifically:
1. In `row 'h'`, `col 'r'`, we only care about how to transform from 'h' to 'r'.
2. In `row 'o'`, `col 'r'`, we only care about how to transform from 'ho' to 'r'.
3.  In `row 'r'`, `col 'o'`, we only care about how to transform from 'hor' to 'ro'.
4. ... I believe you get the point! 😊

What we will do is to find a way to quickly fill the table! The number in the bottom-right of the table will be our answer.

When you mannually fill this table, I believe you can find some certain rules:
+ the number in the first col (i.e. `col 'empty str'`) always equals to the **row index**. This is because we need to remove every char in `word2` to get a empty `word1`!
+ If the last char of `word2` is identical to the last char of `word1`, the operation number should be the same as `table[i-1][j-1]` (just imagine we are dealing with `table[i][j]`)! This is because **if the last char of the two words are the same, we need no more extra operation**!
+ If the last char of `word2` is different from the last char of `word1`, we will have to look at these 3 cells: `table[i][j - 1]`, `table[i - 1][j - 1]` and `table[i - 1][j]`. We will fill `table[i][j]` with the minimum number plus 1. This is because **we have to deal with this char difference (plus 1), and we will choose the optimal way to conduct the former transformation**!

## Code

```
func minDistance(word1 string, word2 string) int {
    pre := make([]int, len(word2) + 1)
    cur := make([]int, len(word2) + 1)
    for i := 0; i < len(pre); i++ {
        pre[i] = i
    }
    for i := 1; i <= len(word1); i++ {
        cur[0] = i
        for j := 1; j < len(pre); j++ {
            if word1[i - 1] != word2[j - 1] {
                cur[j] = min(cur[j - 1], pre[j - 1], pre[j]) + 1
            } else {
                cur[j] = pre[j - 1]
            }
        }
        tmp := make([]int, len(cur))
        copy(tmp, cur)
        pre = tmp
    }
    return pre[len(word2)]
}

func min(nums ...int) int {
    ans := nums[0]
    for _, v := range nums {
        if v < ans {
            ans = v
        }
    }
    return ans
}
```
