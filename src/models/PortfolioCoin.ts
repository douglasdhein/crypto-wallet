import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const portfolioCoinSchema = new Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    symbol: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    priceUsd: {
      type: Number,
      required: true,
      default: 0,
    },
    percentChange24h: {
      type: Number,
      required: true,
      default: 0,
    },
    percentChange7d: {
      type: Number,
      required: true,
      default: 0,
    },
    sparklinePrices: {
      type: [Number],
      default: [],
    },
  },
  {
    collection: "portfolio_coins",
    timestamps: true,
  },
);

portfolioCoinSchema.index({ userId: 1, coinId: 1 }, { unique: true });

export type PortfolioCoinDocument = InferSchemaType<typeof portfolioCoinSchema>;

export const PortfolioCoinModel =
  (models.PortfolioCoin as Model<PortfolioCoinDocument> | undefined) ??
  model<PortfolioCoinDocument>("PortfolioCoin", portfolioCoinSchema);
