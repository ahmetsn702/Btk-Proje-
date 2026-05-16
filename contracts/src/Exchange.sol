// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CategoryPoints1155.sol";
import "./ExtendedPointToken.sol";

/**
 * @title Exchange
 * @notice Merkezi CP↔CP takas havuzu. Tüm kategoriler tek XP rezervine karşı swap edilir.
 *         Kullanıcı CP verir, arka planda XP üzerinden fiyatlanır, diğer CP'yi alır.
 */
contract Exchange is AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "EX: reentrant call");
        _locked = true;
        _;
        _locked = false;
    }
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice XP token (ExtendedPointToken)
    ExtendedPointToken public xpToken;

    /// @notice CP token (CategoryPoints1155)
    CategoryPoints1155 public cpToken;

    /// @notice Her kategori için CP rezervi (havuzdaki CP miktarı)
    mapping(uint256 => uint256) public cpPool;

    /// @notice XP rezervi (toplam havuzda bulunan XP)
    uint256 public xpPool;

    /// @notice Swap fee oranı (basis points): 30 = %0.3
    uint256 public constant SWAP_FEE_BPS = 30;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    /// @notice Fee toplama adresi
    address public treasury;

    /// @notice Kategoriye özel fiyat çarpanları (oracle/algoritma tarafından güncellenir)
    mapping(uint256 => uint256) public priceMultiplier;

    /// @notice Bir interval'daki max fiyat değişimi (% basis points)
    uint256 public constant MAX_PRICE_CHANGE_BPS = 500; // %5

    struct SwapRecord {
        uint256 categoryIn;
        uint256 categoryOut;
        uint256 amountIn;
        uint256 amountOut;
        uint256 fee;
        address user;
        uint256 timestamp;
    }

    SwapRecord[] public swapHistory;

    event Swap(
        address indexed user,
        uint256 indexed categoryIn,
        uint256 indexed categoryOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee
    );

    event LiquidityAdded(
        address indexed provider,
        uint256 xpAmount,
        uint256[] categoryIds,
        uint256[] cpAmounts
    );

    event FeeCollected(uint256 indexed categoryId, uint256 amount, address indexed treasury);

    event PriceMultiplierUpdated(uint256 indexed categoryId, uint256 newMultiplier);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address admin_,
        address xpTokenAddress_,
        address cpTokenAddress_,
        address treasury_
    ) external initializer {
        __AccessControl_init();
        __Pausable_init();

        xpToken = ExtendedPointToken(xpTokenAddress_);
        cpToken = CategoryPoints1155(cpTokenAddress_);
        treasury = treasury_;

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);

        // Default price multipliers = 1.0 (scaled by 1e18)
        priceMultiplier[1] = 1e18;
        priceMultiplier[2] = 1e18;
        priceMultiplier[3] = 1e18;
    }

    /**
     * @notice İlk likiditeyi ekler. Sadece admin çağırabilir (bir kere).
     *         Division by zero önlemi için gereklidir.
     */
    function addInitialLiquidity(
        uint256 xpAmount,
        uint256[] calldata categoryIds,
        uint256[] calldata cpAmounts
    ) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        require(categoryIds.length == cpAmounts.length, "EX: array length mismatch");
        require(xpPool == 0, "EX: liquidity already added");

        // Transfer XP from admin to exchange
        xpToken.transferFrom(msg.sender, address(this), xpAmount);
        xpPool = xpAmount;

        for (uint256 i = 0; i < categoryIds.length; i++) {
            uint256 catId = categoryIds[i];
            uint256 amount = cpAmounts[i];

            // DEĞİŞEN KISIM: Admin'den transfer etmek yerine, Exchange kontratı kendine CP mintler
            cpToken.mint(address(this), catId, amount);
            
            cpPool[catId] = amount;
        }

        emit LiquidityAdded(msg.sender, xpAmount, categoryIds, cpAmounts);
    }

    /**
     * @notice CP↔CP takas. Kullanıcı categoryIn CP'si verir, categoryOut CP'si alır.
     *         Fiyat XP rezervi üzerinden hesaplanır.
     */
    function swapCPforCP(
        uint256 categoryIn,
        uint256 categoryOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        require(categoryIn != categoryOut, "EX: same category");
        require(amountIn > 0, "EX: zero amount");
        require(cpPool[categoryIn] > 0 && cpPool[categoryOut] > 0, "EX: insufficient liquidity");

        // Kullanıcı CP'sini exchange'e transfer et
        cpToken.safeTransferFrom(msg.sender, address(this), categoryIn, amountIn, "");

        // Fee hesapla (%0.3)
        uint256 fee = (amountIn * SWAP_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        // Fiyat hesaplama: XP üzerinden yönlendirme
        // rateIn = xpPool / cpPool[categoryIn]  (XP başına CP)
        // rateOut = xpPool / cpPool[categoryOut]
        // amountOut = amountInAfterFee * rateIn / rateOut
        //           = amountInAfterFee * cpPool[categoryOut] / cpPool[categoryIn]
        uint256 multIn = priceMultiplier[categoryIn];
        uint256 multOut = priceMultiplier[categoryOut];
        if (multIn == 0) multIn = 1e18;
        if (multOut == 0) multOut = 1e18;

        amountOut = (amountInAfterFee * cpPool[categoryOut] * multIn) / (cpPool[categoryIn] * multOut);

        require(amountOut >= minAmountOut, "EX: slippage exceeded");

        // Havuzları güncelle
        cpPool[categoryIn] += amountInAfterFee;
        cpPool[categoryOut] -= amountOut;

        // Fee CP'sini treasury'ye transfer et
        if (fee > 0) {
            cpToken.safeTransferFrom(address(this), treasury, categoryIn, fee, "");
            emit FeeCollected(categoryIn, fee, treasury);
        }

        // Kullanıcıya çıkış CP'sini gönder
        cpToken.safeTransferFrom(address(this), msg.sender, categoryOut, amountOut, "");

        // Swap kaydı
        swapHistory.push(SwapRecord({
            categoryIn: categoryIn,
            categoryOut: categoryOut,
            amountIn: amountIn,
            amountOut: amountOut,
            fee: fee,
            user: msg.sender,
            timestamp: block.timestamp
        }));

        emit Swap(msg.sender, categoryIn, categoryOut, amountIn, amountOut, fee);
    }

    /**
     * @notice Takas için tahmini çıkış miktarını döner (view function).
     */
    function getQuote(
        uint256 categoryIn,
        uint256 categoryOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 fee) {
        if (cpPool[categoryIn] == 0 || cpPool[categoryOut] == 0) {
            return (0, 0);
        }

        fee = (amountIn * SWAP_FEE_BPS) / BPS_DENOMINATOR;
        uint256 amountInAfterFee = amountIn - fee;

        uint256 multIn = priceMultiplier[categoryIn];
        uint256 multOut = priceMultiplier[categoryOut];
        if (multIn == 0) multIn = 1e18;
        if (multOut == 0) multOut = 1e18;

        amountOut = (amountInAfterFee * cpPool[categoryOut] * multIn) / (cpPool[categoryIn] * multOut);
    }

    /**
     * @notice Algoritma servisi tarafından çağrılır (oracle pattern).
     *         Kategoriye özel fiyat çarpanını günceller.
     */
    function updatePriceMultiplier(
        uint256 categoryId,
        uint256 newMultiplier
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newMultiplier > 0, "EX: invalid multiplier");
        // Max değişim sınırı
        uint256 oldMult = priceMultiplier[categoryId];
        if (oldMult == 0) oldMult = 1e18;
        uint256 change = newMultiplier > oldMult
            ? ((newMultiplier - oldMult) * BPS_DENOMINATOR) / oldMult
            : ((oldMult - newMultiplier) * BPS_DENOMINATOR) / oldMult;
        require(change <= MAX_PRICE_CHANGE_BPS, "EX: price change too large");

        priceMultiplier[categoryId] = newMultiplier;
        emit PriceMultiplierUpdated(categoryId, newMultiplier);
    }

    /**
     * @notice Treasury adresini günceller.
     */
    function setTreasury(address treasury_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasury = treasury_;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    /**
     * @notice ERC1155 receive hook — CP transfer'lerini kabul etmek için.
     */
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] memory,
        uint256[] memory,
        bytes memory
    ) public pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
