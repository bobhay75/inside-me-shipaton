export type PremiumState = {
  configured: boolean;
  isPro: boolean;
  priceText?: string;
  message?: string;
};

let configured = false;
let selectedPackage: any = null;

async function getPurchases() {
  const mod = await import('react-native-purchases');
  return mod.default;
}

export async function configureRevenueCat(): Promise<PremiumState> {
  const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
  if (!apiKey) {
    return {
      configured: false,
      isPro: false,
      message: 'Add EXPO_PUBLIC_REVENUECAT_API_KEY to connect the RevenueCat demo.',
    };
  }

  try {
    const Purchases = await getPurchases();
    if (!configured) {
      Purchases.configure({ apiKey });
      configured = true;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const offerings = await Purchases.getOfferings();
    selectedPackage = offerings.current?.availablePackages?.[0] ?? null;

    return {
      configured: true,
      isPro: Boolean(customerInfo.entitlements.active['pro']),
      priceText: selectedPackage?.product?.priceString,
      message: selectedPackage ? undefined : 'Connected. Add a current offering in RevenueCat to finish the demo.',
    };
  } catch (error) {
    return {
      configured: false,
      isPro: false,
      message: error instanceof Error ? error.message : 'RevenueCat setup could not be completed.',
    };
  }
}

export async function purchasePro(): Promise<PremiumState> {
  try {
    const Purchases = await getPurchases();
    if (!selectedPackage) return configureRevenueCat();
    const result = await Purchases.purchasePackage(selectedPackage);
    return {
      configured: true,
      isPro: Boolean(result.customerInfo.entitlements.active['pro']),
      priceText: selectedPackage?.product?.priceString,
    };
  } catch (error: any) {
    if (error?.userCancelled) {
      return { configured: true, isPro: false, message: 'Purchase cancelled.' };
    }
    return {
      configured: true,
      isPro: false,
      message: error instanceof Error ? error.message : 'Purchase could not be completed.',
    };
  }
}
