import { rarities } from "../anno-config";
import { AnnoItem, EffectTarget } from "./AnnoItem";

export default class AnnoItemFactory {
  private translations: { [key: number]: string };
  private effectTargetPoolById: { [key: number]: any };
  private rewardPoolById: { [key: number]: any };
  private traderProfiles: {
    forEach: any;
    [key: number]: any;
  };
  private rewardItemPools: { [key: number]: any };

  private traderItems: { [key: number]: any };

  constructor(
    translations: { [key: number]: string },
    effectTargetPoolById: { [key: number]: any },
    rewardPoolById: { [key: number]: any },
    traderProfiles: Array<any>,
    rewardItemPools: { [key: number]: any }
  ) {
    this.translations = translations;
    this.effectTargetPoolById = effectTargetPoolById;
    this.rewardPoolById = rewardPoolById;
    this.traderProfiles = traderProfiles;
    this.rewardItemPools = rewardItemPools;
    this.traderItems = this.resolveTraderItems();
  }

  public newAnnoItem(asset: any): AnnoItem {
    const values = asset.Values;

    const rarity = values.Item.Rarity?.toLowerCase() || rarities[0].key;
    const iconPath = values.Standard.IconFilename.replace(
      "data/ui/2kimages/",
      "/img/"
    ).replace(".png", "_0.png");

    return {
      id: values.Standard.GUID,
      type: (asset.Values.Item && asset.Values.Item.Allocation
        ? asset.Values.Item.Allocation + "item"
        : asset.Template
      ).toLowerCase(),
      name: this.translations[values.Standard.GUID],
      icon: iconPath,
      effectTargets: this.resolveEffectTarget(values),
      activeItem:
        values.ItemAction?.ActiveBuff !== undefined ||
        values.ItemAction?.ItemAction !== undefined ||
        values.ItemAction?.ActionTarget !== undefined,
      expeditionAttributes: this.resolveExpeditionAttributes(values),
      rarity: rarity,
      rarityLabel:
        this.translations[
          rarities.find((r) => r.key === rarity)?.labelId as number
        ],
      upgrades: this.getUpgrades(values),
      trader: this.resolveTrader(values),
    };
  }

  private resolveEffectTarget(values: any): EffectTarget[] {
    if (!values.ItemEffect) {
      return [];
    }

    let effectTargets = values.ItemEffect.EffectTargets.Item;

    if (!Array.isArray(effectTargets)) {
      effectTargets = [effectTargets];
    }

    return effectTargets
      .flatMap((target: any) => {
        const effectTargetPool = this.effectTargetPoolById[target.GUID];
        if (!effectTargetPool) {
          return [
            {
              label: this.translations[target.GUID],
              visible: true,
            },
          ];
        }

        let effectTargets =
          effectTargetPool.Values.ItemEffectTargetPool.EffectTargetGUIDs.Item;
        if (!Array.isArray(effectTargets)) {
          effectTargets = [effectTargets];
        }

        return [
          {
            label: this.translations[target.GUID],
            visible: true,
          },
          ...effectTargets.map((et: any) => ({
            label: this.translations[et.GUID],
            visible: false,
          })),
        ];
      })
      .filter((target: EffectTarget) => target.label);
  }

  private resolveTrader(values: any) {
    let o: Array<any> = [];
    Object.entries(this.traderItems).forEach((keyval) => {
      if (keyval[1].includes(values.Standard.GUID)) {
        o.push(keyval[0]);
      }
    });
    return o;
  }

  private resolveTraderItems(): { [key: string]: any } {
    let o: { [key: string]: Array<number> } = {};
    this.traderProfiles.forEach((profile: { [key: string]: any }) => {
      try {
        //console.log(profile.Values.Standard.Name)
        let rewardItemPoolGuid =
          profile.Values.Trader.Progression.EarlyGame.OfferingItems;
        if (rewardItemPoolGuid != undefined) {
          let rewardItemPoolGuids = this.rewardItemPools[
            rewardItemPoolGuid
          ].Values.RewardPool.ItemsPool.Item.map(
            (i: { [key: string]: number }) => {
              return i.ItemLink;
            }
          );

          let rewardPoolGuids = rewardItemPoolGuids
            .map((rig: any) => {
              // some guids are rewardpool and not rewarditempool guids
              if (Object.keys(this.rewardItemPools).includes(`${rig}`)) {
                if (this.rewardItemPools[rig].Values.RewardPool != "") {
                  // extract one/multiple rewardpool guid from rewarditempool
                  if (
                    Array.isArray(
                      this.rewardItemPools[rig].Values.RewardPool.ItemsPool.Item
                    )
                  ) {
                    let o = this.rewardItemPools[
                      rig
                    ].Values.RewardPool.ItemsPool.Item.map(
                      (i: { [key: string]: number }) => {
                        return i.ItemLink;
                      }
                    );
                    return o;
                  } else {
                    return this.rewardItemPools[rig].Values.RewardPool.ItemsPool
                      .Item.ItemLink;
                  }
                }
              } else {
                return rig;
              }
            })
            .filter((a: undefined) => a != undefined)
            .flat();

          let itemGuids = rewardPoolGuids
            .map((rg: any) => {
              if (Object.keys(this.rewardPoolById).includes(`${rg}`)) {
                if (this.rewardPoolById[rg].Values.RewardPool != "") {
                  // extract one/multiple rewardpool guid from rewarditempool
                  if (
                    Array.isArray(
                      this.rewardPoolById[rg].Values.RewardPool.ItemsPool.Item
                    )
                  ) {
                    let o = this.rewardPoolById[
                      rg
                    ].Values.RewardPool.ItemsPool.Item.map(
                      (i: { [key: string]: number }) => {
                        return i.ItemLink;
                      }
                    );
                    return o;
                  } else {
                    return this.rewardPoolById[rg].Values.RewardPool.ItemsPool
                      .Item.ItemLink;
                  }
                }
              } else {
                return rg;
              }
            })
            .filter((a: number) => a != undefined)
            .flat();
          let name = profile.Values.Standard.Name.split("(")[1].replace(
            ")",
            ""
          );
          o[name] = itemGuids;
        }
      } catch (e) {
        //console.log(e.toString())
      }
    });
    return o;
  }

  private resolveExpeditionAttributes(values: any) {
    let attributes =
      values.ExpeditionAttribute?.ExpeditionAttributes?.Item || [];
    if (!Array.isArray(attributes)) {
      attributes = [attributes];
    }

    return attributes
      .filter((attribute: any) => attribute?.Attribute)
      .map((attribute: any) => ({
        key: attribute.Attribute.toLowerCase(),
        value: attribute.Amount || 1,
      }));
  }

  private getUpgrades(values: any) {
    return Object.entries(values)
      .filter(([key, value]) => key.includes("Upgrade") && value !== "")
      .flatMap(([, value]: any[]) =>
        Object.entries(value).map(([upgradeKey, v]: [string, any]) => ({
          key: upgradeKey,
          value: this.translateValue(upgradeKey, v),
        }))
      )
      .filter(
        (upgrade) => upgrade.key !== "PublicServiceNoSatisfactionDistance"
      );
  }

  private translateValue(upgradeKey: string, value: any): any {
    if (upgradeKey === "GenPool") {
      const genPool = this.rewardPoolById[value];
      if (!genPool) {
        return [value];
      }
      let products = genPool.Values.RewardPool.ItemsPool.Item;
      if (!Array.isArray(products)) {
        products = [products];
      }

      return products.map((p: any) => this.translations[p.ItemLink]);
    }

    if (
      typeof value === "number" &&
      value >= 10000 &&
      this.translations[value]
    ) {
      return this.translations[value];
    }

    if (
      typeof value === "object" &&
      typeof value.Item === "object" &&
      !Array.isArray(value.Item)
    ) {
      value.Item = [value.Item];
    }

    if (typeof value === "object" && Array.isArray(value.Item)) {
      for (const item of value.Item) {
        for (const property in item) {
          const value = item[property];

          if (
            typeof value === "number" &&
            value >= 10000 &&
            this.translations[value]
          ) {
            item[`${property}_label`] = this.translations[value];
          }
        }
      }
    }

    return value;
  }
}
