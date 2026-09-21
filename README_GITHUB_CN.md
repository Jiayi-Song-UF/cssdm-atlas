# 全物种 Florida 交互地图：上传与发布指南

这是一个已生成数据的静态网站，不需要租服务器，不需要运行模型，不需要
Earth Engine 账号、API key、npm 或付费地图服务。访客通过网址打开页面，
选择任意一个模型物种，即可查看其 Florida 全州分布。

## 一、先理解这次交付的范围

- 全部 **3,123 个物种**，不是示例物种子集。
- **66 个县、579,752 个预测网格**；Monroe 缺原始影像，显示为“暂无数据”。
- 显示五模型平均预测；不展示单模型和不确定性。
- 所有原始约 504 m 网格均保留，未为了减小体积降低空间分辨率。
- 网页数值采用每个物种 128 级量化，最大绝对误差不超过约 **0.00394**；
  页面显示该物种自己的实际精度上限。原始 float32 科研结果没有修改。
- 这是定性生态评判用的展示版。低分值的相对误差可能较大，精确分析仍用 HPC 原文件。
- 默认色标 0–1；增强对比色标使用该物种全州百分位，不是每县分别拉伸。

全网站应低于 GitHub Pages 的 1 GB 限制，打包脚本还设置了 950 MB 安全门槛。
具体字节数见 HPC 上的 `20260920/ATLAS_PACKAGE.json`。不要再把原始 TIFF
或 ZIP 放进网站仓库，否则可能超过限制。

GitHub Free 可以从公开仓库发布 Pages。**公开仓库和网站内容可被任何人访问、下载**；
请先确认课题组同意公开这批派生预测地图。不要上传原始 Planet 影像、账号凭据或未获许可的数据。

## 二、把准备好的 ZIP 下载到你的电脑

HPC 上的交付包：

```text
/blue/changzhao/ji.song/a_CSSDM/20260920/cssdm-atlas-all-species.zip
```

使用你平时连接 HiPerGator 的文件传输方式（例如现有 SFTP 客户端或服务器文件浏览器），
找到这个文件并下载。不要下载整个 `a_CSSDM` 项目。

在自己的电脑解压。你会得到一个 `cssdm-atlas` 文件夹，里面应有：

```text
cssdm-atlas/
  index.html
  app.js
  style.css
  .nojekyll
  .gitignore
  README.md
  README_GITHUB_CN.md
  DATA_FORMAT.md
  vendor/
  data/
    READY.json
    metadata.json
    species.json
    counties.geojson
    grid-indices.u32.gz
    county-ids.u8.gz
    species/
      00/ ... 31/
```

Windows 可在资源管理器打开“显示隐藏的项目”；macOS Finder 按
`Command + Shift + .` 查看隐藏文件。`.nojekyll` 也要复制。

**不要把 ZIP 文件本身上传到 GitHub。GitHub 不会自动帮你解压成网站。**

## 三、创建一个专用 GitHub 仓库

建议使用新仓库，避免与其他项目混合，也方便控制容量。

1. 浏览器登录 GitHub，右上角 `+` → `New repository`。
2. Repository name 填 `cssdm-atlas`，也可以自选其他英文名称。
3. Visibility 选 **Public**。如果必须保密，先不要发布；免费公开 Pages 不适合保密评阅。
4. 可勾选 `Add a README file`，这样初始 `main` 分支已经存在。
5. 不必添加 `.gitignore` 模板，也不要在未确定数据授权前随意添加数据许可证。
6. 点击 `Create repository`。

若已有一个专门用于这个网站的仓库，也可以复用；不要覆盖无关项目中的同名文件。

## 四、用 GitHub Desktop 上传（Windows/macOS 推荐）

不推荐网页上的 `Upload files`：GitHub 网页一次最多上传 100 个文件，而这里有
3,000 多个数据文件。GitHub Desktop 可以整体上传，不需要在终端管理 token。

1. 从 [GitHub Desktop 官网](https://desktop.github.com/) 安装 Desktop，登录你的 GitHub 账号。
2. 选择 `File` → `Clone repository`。
3. 在 `GitHub.com` 列表里选择刚建的 `cssdm-atlas`，或在 `URL` 页粘贴仓库地址。
4. Local path 选择电脑上一个空的新位置，然后点击 `Clone`。
5. 通过 Desktop 的 `Repository` → `Show in Explorer` / `Show in Finder` 打开克隆目录。
6. 把解压得到的 **`cssdm-atlas` 文件夹里面的全部内容**复制到这个克隆目录。
   允许替换刚才生成的占位 `README.md`，但不要删除或替换克隆目录里的 `.git` 文件夹。
7. 检查 `index.html` 直接位于仓库根目录：

   正确：`你的本地仓库/index.html`

   错误：`你的本地仓库/cssdm-atlas/index.html`

8. 回到 GitHub Desktop，等待扫描文件完成。数千个文件可能需要一点时间。
9. 确認当前分支为 `main`。左下角 Summary 输入 `Add all-species Florida atlas`。
10. 点击 `Commit to main`。
11. 点击上方 `Push origin`。首次上传接近 1 GB，需要等待网络传输完成；上传期间不要关闭软件。
12. 回到 GitHub 网页刷新，确认根目录有 `index.html`、`data/`、`vendor/`。

**不要启用 Git LFS，也不要上传原始预测 TIFF。** 本包中每个单独文件都很小，
不需要 LFS；网站需要直接读取真实数据文件，而不是 LFS 指针。

## 五、开启 GitHub Pages

在 GitHub 网页中打开这个仓库：

1. 点击仓库上方 `Settings`。
2. 左侧找到 `Pages`。
3. 在 `Build and deployment` 中，Source 选择 **`Deploy from a branch`**。
4. Branch 选择 **`main`**。
5. 旁边的文件夹选择 **`/(root)`**。
6. 点击 **`Save`**。
7. 去 `Actions` 查看 `pages build and deployment`，等它变成绿色。
8. 回到 `Settings` → `Pages`，点击显示的 `Visit site`。

通常网址是：

```text
https://你的GitHub用户名.github.io/cssdm-atlas/
```

若仓库名称不是 `cssdm-atlas`，替换最后一段。以后把这个网站网址发给老师，
不要发 GitHub 仓库文件浏览页。首次部署需要等待，以 Actions 的实际状态为准。

不需要配置 Custom domain，不需要买域名，不需要 Secrets，不需要创建 Actions YAML。
如果有 `Enforce HTTPS` 选项，保持开启。

## 六、上线后逐项检查

1. 首页出现 Florida 和物种列表，列表总数为 **3,123**。
2. 搜索一个熟悉的物种，点击列表；全州图层应该随之改变。
3. 点击一个有预测的网格，查看县名、近似得分、量化误差、经纬度。
4. 点击 `Entire Florida` 返回全州；使用 `Go to` 可以定位任意县。
5. 选择 Monroe，确认显示 `No data`，不是 0。
6. 切换 `Fixed: 0–1` 与 `Enhanced`，确认色标同步变化。
7. 点击 `Copy map link`，把链接放到新窗口：应还原物种、位置、缩放和色标模式。
8. 用手机也打开一次。手机页面地图在上，物种搜索和控件在下，向下滚动即可选择。

网站会按需下载当前物种，**访问者不会一次下载整个网站的数据**。界面使用英文，
便于向老师和研究合作者展示；本配置说明使用中文。

## 七、可选：发布前在自己电脑预览

如果电脑已安装 Python，在解压后的 `cssdm-atlas` 目录打开终端：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Windows 若 `python` 不可用，可用 `py -m http.server 8000 --bind 127.0.0.1`。
macOS 若命令为 `python3`，则使用 `python3 -m http.server 8000 --bind 127.0.0.1`。
浏览器访问 `http://127.0.0.1:8000/`。停止预览按 `Ctrl+C`。

不要直接双击 HTML 文件；`file://` 模式通常不能读取旁边的数据文件。
这个本地预览服务只绑定电脑自己的回环地址，不是网站上线所需的服务器。

## 八、如果偏好命令行上传

在已登录/配置好 Git 凭据的电脑上，先克隆仓库，再把解压后的内容复制进去：

```bash
git clone https://github.com/YOUR_USERNAME/cssdm-atlas.git
cd cssdm-atlas
# 在文件管理器中把网站内容复制到这个目录后，再运行以下命令。
git status --short
git add .
git commit -m "Add all-species Florida atlas"
git push origin main
```

将 `YOUR_USERNAME` 替换为自己的用户名。不要把 token 写在命令、代码或网页文件中，
也不需要把 token 发给我。认证不熟悉时优先用 GitHub Desktop。
上传后仍需完成第五节的 Pages 配置。

## 九、常见问题

- **404**：先看 Actions 是否部署成功；核对 Pages 的分支、`/(root)` 和 `index.html` 的位置。
- **只有 README，没有地图**：通常是 `index.html` 不在发布目录，或打开的是仓库页面而非 Pages 网站。
- **地图控件出现但数据失败**：检查 `data/READY.json` 和 `data/species/` 是否完整上传，不能只传 HTML。
- **某个物种加载失败**：检查其 `.u8.gz` 文件是否上传；查看浏览器开发者工具 Network 中的 404。
- **底图空白，但预测能显示**：可能是网络无法访问 OpenStreetMap；关闭 `Street basemap` 仍可看预测和县界。
- **解压/大数据文件看不懂**：这些是浏览器自动读取的数据，不需要自己逐个解压。
- **数值与 TIFF 有小差异**：这是明确标注的网页量化误差。精确分析使用 HPC 原始 float32 输出。
- **低得分颜色很接近**：可选 Enhanced，但比较不同物种时优先用固定色标；增强模式不是新预测。
- **以后更新数据怎么办**：更新本地网站目录，Desktop Commit → Push 即可触发部署。不要反复把不同实验的大数据都加到同一个仓库，以免 Git 历史越来越大。
- **浏览器太旧**：更新 Chrome、Edge、Firefox 或 Safari；页面需要浏览器内置 gzip 解压功能。
- **访问量很大怎么办**：Pages 有容量和流量限制，OpenStreetMap 公共底图也有使用政策。研究小规模分享以外，应重新评估托管和底图服务。

## 官方参考

- [Pages 的容量和流量限制](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [配置 Pages 发布目录](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
- [GitHub 网页上传限制](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [GitHub Desktop 克隆仓库](https://docs.github.com/en/desktop/adding-and-cloning-repositories/cloning-and-forking-repositories-from-github-desktop)
- [OpenStreetMap 底图使用政策](https://operations.osmfoundation.org/policies/tiles/)
