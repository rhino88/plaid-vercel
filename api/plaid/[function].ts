import { NowRequest, NowResponse } from "@vercel/node";

import plaid, { PlaidError, Client } from "plaid";

enum Environment {
  PRODUCTION = "production",
  DEVELOPMENT = "development",
  SANDBOX = "sandbox",
}

const environment: Environment =
  process.env.PLAID_ENVIRONMENT === "production"
    ? Environment.PRODUCTION
    : process.env.PLAID_ENVIRONMENT === "development"
    ? Environment.PRODUCTION
    : Environment.SANDBOX;

const plaidClient: Client = new plaid.Client(
  process.env.PLAID_CLIENT_ID ?? "",
  process.env.PLAID_SECRET ?? "",
  process.env.PLAID_PUBLIC_KEY ?? "",
  plaid.environments[environment] ?? ""
);

// Hack for...
// 1. PlaidClient functions using ordered arguments instead of a single object argument
// 2. Avoiding runtime introspection of PlaidClient functions
const plaidOrderedParametersByFunction = {
  createAssetReport: ["accessTokens", "daysRequested", "options"],
  createDepositSwitch: ["targetAccountId", "targetAccessToken", "options"],
  createDepositSwitchToken: ["depositSwitchId", "options"],
  createItemAddToken: ["options"],
  createPayment: ["recipient_id", "reference", "amount"],
  createPaymentRecipient: ["name", "iban", "address"],
  createPaymentToken: ["paymentId"],
  createProcessorToken: ["accessToken", "accountId", "processor"],
  createPublicToken: ["accessToken"],
  createStripeToken: ["accessToken", "accountId"],
  deleteItem: ["accessToken"],
  exchangePublicToken: ["publicToken"],
  filterAssetReport: ["assetReportToken", "accountIdsToExclude"],
  getAccounts: ["accessToken", "options"],
  getAllTransactions: ["accessToken", "startDate", "endDate", "options"],
  getAssetReport: ["assetReportToken", "includeInsights"],
  getAssetReportPdf: ["assetReportToken"],
  getAuditCopy: ["auditCopyToken"],
  getAuth: ["accessToken", "options"],
  getBalance: ["accessToken", "options"],
  getCategories: [],
  getCreditDetails: ["accessToken"],
  getDepositSwitch: ["depositSwitchId", "options"],
  getHoldings: ["accessToken"],
  getIncome: ["accessToken"],
  getInstitutionById: ["institutionId", "options"],
  getInstitutions: ["count", "offset", "options"],
  getInvestmentTransactions: ["accessToken", "startDate", "endDate", "options"],
  getItem: ["accessToken"],
  getLiabilities: ["accessToken", "options"],
  getPayment: ["paymentId"],
  getPaymentRecipient: ["recipientId"],
  getTransactions: ["accessToken", "startDate", "endDate", "options"],
  getWebhookVerificationKey: ["keyId"],
  importItem: ["products", "userAuth", "options"],
  invalidateAccessToken: ["accessToken"],
  listPaymentRecipients: [],
  refreshAssetReport: ["assetReportToken", "daysRequested", "options"],
  refreshTransactions: ["accessToken"],
  removeAssetReport: ["assetReportToken"],
  removeAuditCopy: ["auditCopyToken"],
  removeItem: ["accessToken"],
  resetLogin: ["accessToken"],
  sandboxItemFireWebhook: ["accessToken", "webhookCode"],
  sandboxItemSetVerificationStatus: [
    "accessToken",
    "accountId",
    "verificationStatus",
  ],
  sandboxPublicTokenCreate: ["institutionId", "initialProducts", "options"],
  searchInstitutionsByName: ["query", "products", "options"],
  updateItemWebhook: ["accessToken", "webhook"],
};

const snakeToCamel = (str: string) =>
  str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace("-", "").replace("_", "")
  );

const snakeToCamelKeys = (obj: any) =>
  Object.keys(obj).reduce(
    (acc, key) => ({
      ...acc,
      ...{ [snakeToCamel(key)]: obj[key] },
    }),
    {}
  );

const createErrorResponse = (
  res: NowResponse,
  error: Error | PlaidError
): NowResponse =>
  res.status(500).json({
    code: (error as PlaidError).error_code ?? "",
    type: (error as PlaidError).error_type ?? "",
    message: (error as PlaidError).error_message ?? error.message,
    displayMessage:
      (error as PlaidError).display_message ??
      "Unknown error, please try again later.",
    stack: error.stack,
  });

export default async (req: NowRequest, res: NowResponse) => {
  const plaidFunctionName = req.query.function as string;
  const plaidFunction = plaidClient[plaidFunctionName];
  if (typeof plaidFunction === "undefined") {
    return createErrorResponse(
      res,
      new Error(`A function named ${plaidFunctionName} is not available.`)
    );
  }

  let requestParameters: object;
  try {
    requestParameters = req.body ? JSON.parse(req.body) : req.query;
  } catch (error) {
    return createErrorResponse(res, error);
  }

  // Support both snake and camel case parameter names
  requestParameters = snakeToCamelKeys(requestParameters);

  // Order the parameters per function signature :(
  const orderedArgumentNames =
    plaidOrderedParametersByFunction[plaidFunctionName];
  const orderedArguments = orderedArgumentNames.map(
    (parameterName: string) => requestParameters[parameterName]
  );

  try {
    const response = await plaidFunction.call(
      plaidClient,
      orderedArguments.length > 0 ? orderedArguments : null
    );
    res.status(200).json({
      status: 200,
      json: response,
    });
  } catch (error) {
    return createErrorResponse(res, error);
  }
};
