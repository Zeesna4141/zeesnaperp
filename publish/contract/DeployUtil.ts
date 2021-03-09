/* eslint-disable @typescript-eslint/no-non-null-assertion */

import bre, { ethers } from "@nomiclabs/buidler"
import { TASK_COMPILE } from "@nomiclabs/buidler/builtin-tasks/task-names"
import { LEGACY_SRC_DIR, SRC_DIR } from "../../constants"
import { flatten } from "../../scripts/flatten"
import { ChainlinkPriceFeed, ClearingHouse, L2PriceFeed } from "../../types/ethers"
import { ContractName } from "../ContractName"
import { MigrationContext, MigrationTask } from "../Migration"
import { ContractWrapperFactory } from "./ContractWrapperFactory"
import { AmmConfig } from "./DeployConfig"

export type DeployTask = () => Promise<void>

export async function getImplementation(proxyAdminAddr: string, proxyAddr: string) {
    const proxyAdminAbi = ["function getProxyImplementation(address proxy) view returns (address)"]
    const proxyAdmin = await ethers.getContractAt(proxyAdminAbi, proxyAdminAddr)
    return proxyAdmin.getProxyImplementation(proxyAddr)
}

export function makeLegacyAmmDeployMigrationTasks(
    context: MigrationContext,
    ammConfig: AmmConfig,
    needFlatten = false,
): MigrationTask[] {
    return [
        async (): Promise<void> => {
            console.log(`deploy ${ammConfig.name} amm...`)
            const filename = `${ContractName.AmmV1}.sol`
            const toFilename = `${ContractName.Amm}.sol`
            const l2PriceFeedContract = context.factory.create<L2PriceFeed>(ContractName.L2PriceFeed)

            if (needFlatten) {
                // after flatten sol file we must re-compile again
                await flatten(LEGACY_SRC_DIR, bre.config.paths.sources, filename, toFilename)
                await bre.run(TASK_COMPILE)
            }

            const ammContract = context.factory.createAmm(ammConfig.name)
            const quoteTokenAddr = context.externalContract.usdc!
            await ammContract.deployUpgradableContract(
                ammConfig.deployArgs,
                l2PriceFeedContract.address!,
                quoteTokenAddr,
            )
        },
        async (): Promise<void> => {
            console.log(`set ${ammConfig.name} amm Cap...`)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            const { maxHoldingBaseAsset, openInterestNotionalCap } = ammConfig.properties
            if (maxHoldingBaseAsset.gt(0)) {
                await (
                    await amm.setCap({ d: maxHoldingBaseAsset.toString() }, { d: openInterestNotionalCap.toString() })
                ).wait(context.deployConfig.confirmations)
            }
        },
        async (): Promise<void> => {
            console.log(`${ammConfig.name} amm.setCounterParty...`)
            const clearingHouseContract = context.factory.create<ClearingHouse>(ContractName.ClearingHouse)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setCounterParty(clearingHouseContract.address!)).wait(context.deployConfig.confirmations)
        },
        async (): Promise<void> => {
            console.log(`opening Amm ${ammConfig.name}...`)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setOpen(true)).wait(context.deployConfig.confirmations)
        },
        async (): Promise<void> => {
            const gov = context.externalContract.foundationGovernance!
            console.log(
                `transferring ${ammConfig.name} owner to governance=${gov}...please remember to claim the ownership`,
            )
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setOwner(gov)).wait(context.deployConfig.confirmations)
        },
    ]
}

export function makeAmmDeployMigrationTasks(
    context: MigrationContext,
    ammConfig: AmmConfig,
    needFlatten = false,
): MigrationTask[] {
    return [
        async (): Promise<void> => {
            console.log(`deploy ${ammConfig.name} amm...`)
            const filename = `${ContractName.Amm}.sol`
            const chainlinkPriceFeedContract = context.factory.create<ChainlinkPriceFeed>(
                ContractName.ChainlinkPriceFeed,
            )

            if (needFlatten) {
                // after flatten sol file we must re-compile again
                await flatten(SRC_DIR, bre.config.paths.sources, filename)
                await bre.run(TASK_COMPILE)
            }

            const ammContract = context.factory.createAmm(ammConfig.name)
            const quoteTokenAddr = context.externalContract.usdc!
            await ammContract.deployUpgradableContract(
                ammConfig.deployArgs,
                chainlinkPriceFeedContract.address!,
                quoteTokenAddr,
            )
        },
        async (): Promise<void> => {
            console.log(`set ${ammConfig.name} amm Cap...`)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            const { maxHoldingBaseAsset, openInterestNotionalCap } = ammConfig.properties
            if (maxHoldingBaseAsset.gt(0)) {
                await (
                    await amm.setCap({ d: maxHoldingBaseAsset.toString() }, { d: openInterestNotionalCap.toString() })
                ).wait(context.deployConfig.confirmations)
            }
        },
        async (): Promise<void> => {
            console.log(`${ammConfig.name} amm.setCounterParty...`)
            const clearingHouseContract = context.factory.create<ClearingHouse>(ContractName.ClearingHouse)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setCounterParty(clearingHouseContract.address!)).wait(context.deployConfig.confirmations)
        },
        async (): Promise<void> => {
            console.log(`opening Amm ${ammConfig.name}...`)
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setOpen(true)).wait(context.deployConfig.confirmations)
        },
        async (): Promise<void> => {
            const gov = context.externalContract.foundationGovernance!
            console.log(
                `transferring ${ammConfig.name} owner to governance=${gov}...please remember to claim the ownership`,
            )
            const amm = await context.factory.createAmm(ammConfig.name).instance()
            await (await amm.setOwner(gov)).wait(context.deployConfig.confirmations)
        },
    ]
}

export async function addAggregator(
    priceFeedKey: string,
    address: string,
    factory: ContractWrapperFactory,
    confirmations: number,
): Promise<void> {
    const chainlinkPriceFeed = await factory.create<ChainlinkPriceFeed>(ContractName.ChainlinkPriceFeed).instance()
    const tx = await chainlinkPriceFeed.addAggregator(ethers.utils.formatBytes32String(priceFeedKey), address)
    await tx.wait(confirmations)
}
