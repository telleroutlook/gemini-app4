# 测试复杂物理公式渲染

这是一个涉及路径积分、场论和特殊函数的复杂物理公式：

$$Z = \int D[\phi]  \exp\left\{ - \frac{1}{2} \int d^4x  \left[ (\partial_\mu \phi(x))^2 + m^2 \phi^2(x) + \frac{\lambda}{4!} \phi^4(x) \right] \right\}  \cdot  \langle\psi_f | T \exp\left\{ -i \int d^4x  H_{int}(x) \right\} | \psi_i\rangle$$

## 符号解释：

- **Z:** 配分函数 (Partition Function) - $Z = \sum_{\text{states}} e^{-\beta E}$
- **$\int D[\phi]$:** 泛函积分 (Functional Integral) - $\int D[\phi] = \lim_{N \to \infty} \prod_{i=1}^{N} d\phi_i$
- **$\phi(x)$:** 标量场 (Scalar Field) - $\phi: \mathbb{R}^4 \to \mathbb{C}$
- **$\partial_\mu \phi(x)$:** 四维导数 - $\partial_\mu = \frac{\partial}{\partial x^\mu}$ 其中 $(\partial_\mu \phi)^2 = \eta^{\mu\nu} \partial_\mu \phi \partial_\nu \phi$
- **$m$:** 场的质量 - $[m] = \text{energy}$
- **$\lambda$:** 耦合常数 (Coupling Constant) - $\lambda \in \mathbb{R}$
- **$\langle\psi_f | \cdots | \psi_i\rangle$:** 量子力学内积 - $\langle\psi_f | U | \psi_i\rangle$
- **$T$:** 时间排序算符 (Time-Ordering Operator)
- **$H_{int}(x)$:** 相互作用哈密顿量密度

## 其他相关公式：

### 传播子 (Propagator):
$$G(x-y) = \langle 0 | T\{\phi(x) \phi(y)\} | 0 \rangle = \int \frac{d^4k}{(2\pi)^4} \frac{i}{k^2 - m^2 + i\epsilon} e^{-ik(x-y)}$$

### 生成泛函 (Generating Functional):
$$Z[J] = \int D[\phi] \exp\left\{ i \int d^4x \left[ \mathcal{L}[\phi] + J(x)\phi(x) \right] \right\}$$

### 有效作用量 (Effective Action):
$$\Gamma[\phi_c] = -i \ln Z[J] - \int d^4x J(x)\phi_c(x)$$

### 费曼规则中的顶点:
对于 $\phi^4$ 理论：
- 传播子: $\frac{i}{p^2 - m^2 + i\epsilon}$
- 四点顶点: $-i\lambda$
- 外线因子: $\sqrt{Z}$

### 量子化条件：
$$[\phi(x), \pi(y)]_{t=t'} = i\delta^3(\mathbf{x} - \mathbf{y})$$

其中 $\pi(x) = \frac{\partial \mathcal{L}}{\partial(\partial_0 \phi)} = \partial_0 \phi(x)$

这些公式在量子场论、统计物理和宇宙学中都有重要应用。