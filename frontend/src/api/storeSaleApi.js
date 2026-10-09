import api from "./axios";

/*
|--------------------------------------------------------------------------
| Store Sales API
|--------------------------------------------------------------------------
| This file contains all API requests related to Store POS
| and Store Sales History.
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| Get Store Sales History
|--------------------------------------------------------------------------
| Optional parameters:
| - search
| - payment_status
| - payment_method
| - sold_by
| - date
|--------------------------------------------------------------------------
*/
export const getStoreSales = async (params = {}) => {
    const response = await api.get("/store-sales", {
        params,
    });

    return response.data;
};


/*
|--------------------------------------------------------------------------
| Get One Store Sale
|--------------------------------------------------------------------------
| Used when the user opens the details of a specific sale.
|--------------------------------------------------------------------------
*/
export const getStoreSale = async (storeSaleId) => {
    const response = await api.get(
        `/store-sales/${storeSaleId}`
    );

    return response.data;
};


/*
|--------------------------------------------------------------------------
| Create / Complete Store Sale
|--------------------------------------------------------------------------
| This is called when the cashier clicks "Complete Sale"
| in Store POS.
|--------------------------------------------------------------------------
*/
export const createStoreSale = async (saleData) => {
    const response = await api.post(
        "/store-sales",
        saleData
    );

    return response.data;
};