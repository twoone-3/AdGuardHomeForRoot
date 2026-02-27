# 变量定义
TMP_DIR := tmp
SRC_DIR := src
BUILD_DIR := $(TMP_DIR)/build
DOWNLOAD_DIR := $(TMP_DIR)/download
WEBUI_DIR := webui

.PHONY: all clean build-webui

all: clean pack-arm64 pack-armv7

# 下载规则
$(DOWNLOAD_DIR)/AdGuardHome_linux_%.tar.gz:
	@echo "Downloading AdGuardHome for $*..."
	@mkdir -p $(DOWNLOAD_DIR)
	curl --connect-timeout 5 --progress-bar -L -o $@ https://github.com/AdguardTeam/AdGuardHome/releases/latest/download/AdGuardHome_linux_$*.tar.gz

# 解压规则
$(DOWNLOAD_DIR)/extracted/%/AdGuardHome/AdGuardHome: $(DOWNLOAD_DIR)/AdGuardHome_linux_%.tar.gz
	@echo "Extracting AdGuardHome for $*..."
	@mkdir -p $(DOWNLOAD_DIR)/extracted/$*
	tar -xzf $< -C $(DOWNLOAD_DIR)/extracted/$*

# WebUI 构建
build-webui:
	@echo "Building Web UI..."
	cd $(WEBUI_DIR) && pnpm install && pnpm build

# Pack 规则
pack-%: build-webui $(DOWNLOAD_DIR)/extracted/%/AdGuardHome/AdGuardHome
	@echo "Packing for $*..."
	@mkdir -p $(BUILD_DIR)/$*
	cp -vr $(SRC_DIR)/* $(BUILD_DIR)/$*/
	@mkdir -p $(BUILD_DIR)/$*/webroot
	cp -vr $(WEBUI_DIR)/dist/* $(BUILD_DIR)/$*/webroot/
	@mkdir -p $(BUILD_DIR)/$*/bin
	cp -v $(DOWNLOAD_DIR)/extracted/$*/AdGuardHome/AdGuardHome $(BUILD_DIR)/$*/bin/AdGuardHome
	cd $(BUILD_DIR)/$* && zip -r ../../../AdGuardHomeForRoot_$*.zip *
	@echo "Packing for $* completed successfully."

clean:
	@echo "Cleaning up..."
	rm -rf $(DOWNLOAD_DIR) $(BUILD_DIR) AdGuardHomeForRoot_*.zip


