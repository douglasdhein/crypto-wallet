import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const portfolioTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    coinId: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },
    totalAmountUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    executedAt: {
      type: Date,
      required: true,
    },
    historicalPriceUsd: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    collection: "portfolio_transactions",
    timestamps: true,
  },
);

portfolioTransactionSchema.index({ userId: 1, coinId: 1, executedAt: -1 });

export type PortfolioTransactionDocument = InferSchemaType<
  typeof portfolioTransactionSchema
>;

export const PortfolioTransactionModel =
  (models.PortfolioTransaction as
    | Model<PortfolioTransactionDocument>
    | undefined) ??
  model<PortfolioTransactionDocument>(
    "PortfolioTransaction",
    portfolioTransactionSchema,
  );
