# add busybox to PATH
[ -d "/data/adb/magisk" ] && export PATH="/data/adb/magisk:$PATH"
[ -d "/data/adb/ksu/bin" ] && export PATH="/data/adb/ksu/bin:$PATH"
[ -d "/data/adb/ap/bin" ] && export PATH="/data/adb/ap/bin:$PATH"

# most of the users are Chinese, so set default language to Chinese
language="zh"

# try to get the system language
locale=$(getprop persist.sys.locale || getprop ro.product.locale || getprop persist.sys.language)

# if the system language is English, set language to English
if echo "$locale" | grep -qi "en"; then
  language="en"
fi

function log() {
  local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
  local str
  [ "$language" = "en" ] && str="$timestamp $1" || str="$timestamp $2"
  echo "$str" | tee -a "$AGH_DIR/history.log"
}

function update_description() {
  local description
  [ "$language" = "en" ] && description="$1" || description="$2"
  local module_id
  module_id=$(grep "^id=" "$MOD_PATH/module.prop" | cut -d'=' -f2)
  # use ksu api if available, otherwise fallback to ap api, and finally fallback to sed
  if [ -x /data/adb/ksud ]; then
    # ksud reads the module id from KSU_MODULE; MODULE_ID is kept for older builds
    KSU_MODULE="$module_id" MODULE_ID="$module_id" /data/adb/ksud module config set override.description "$description"
  elif [ -x /data/adb/apd ]; then
    MODULE_ID="$module_id" /data/adb/apd module config set override.description "$description"
  else
    sed -i "/^description=/c\description=$description" "$MOD_PATH/module.prop"
  fi
}
